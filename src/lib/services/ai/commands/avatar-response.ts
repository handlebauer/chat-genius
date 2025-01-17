import { stripHtml } from '@/components/search-results'
import {
    AICommandContext,
    AICommandHandler,
    AIResponse,
    SearchResult,
} from '../types'

const SYSTEM_PROMPT = `You are an AI avatar that perfectly mirrors the communication style, expertise, and personality of a specific user (the "style user"). Your task is to respond to messages from another user (the "conversation partner") in a way that perfectly matches how the style user would respond.

You have access to:
1. STYLE_CONTEXT: Semantically relevant messages from the style user that match the current topic. Study these to mirror their:
   - Exact phrases and terminology they frequently use
   - Technical knowledge and how they explain things
   - Level of formality and conversation style
   - Response patterns and depth

2. CONVERSATION_HISTORY: Recent messages in this conversation

Your response must:
1. Sound EXACTLY like something the style user would say
2. Be brief (1-3 sentences)
3. Match their typical response style and depth
4. Stay true to their knowledge areas and opinions
5. NEVER end with a question (only 5% of the time)

Style Context:
\`\`\`
{context}
\`\`\`

Conversation History:
\`\`\`
{conversationHistory}
\`\`\`
`

export const avatarResponse: AICommandHandler = {
    commandId: 'avatar-response',
    systemPrompt: SYSTEM_PROMPT,

    async handleQuestion({
        question,
        channelId,
        context,
        commandContext,
    }): Promise<AIResponse> {
        if (!channelId) {
            throw new Error(
                'Channel ID is required for avatar-response command',
            )
        }

        if (!commandContext?.originalUserId) {
            throw new Error('Original user ID is required')
        }

        if (!commandContext?.currentUserId) {
            throw new Error('Current user ID is required')
        }

        // Get semantically relevant messages from the original user
        const embedding = await context.generateEmbedding(question)
        const relevantStyleMessages = await searchUserMessages(
            embedding,
            commandContext.originalUserId,
            context,
        )

        // Get recent conversation history
        const conversationMessages = await getChannelMessages(
            channelId,
            context,
        )

        const response = await generateResponse(
            question,
            relevantStyleMessages,
            conversationMessages,
            commandContext.originalUserName || 'User',
            context,
            this.systemPrompt,
        )

        return {
            content: response,
            relevantMessages: [
                ...(relevantStyleMessages || []),
                ...(conversationMessages || []),
            ],
        }
    },
}

async function searchUserMessages(
    embedding: number[],
    userId: string,
    context: AICommandContext,
    limit = 10,
    similarity_threshold = 0.2,
): Promise<SearchResult[]> {
    // First get messages using semantic search
    const { data: messages, error } = await context.supabase.rpc(
        'match_messages',
        {
            query_embedding: JSON.stringify(embedding),
            match_threshold: similarity_threshold,
            match_count: limit * 2, // Get more initially as we'll filter
        },
    )

    if (error) {
        console.error('Error searching messages:', error)
        return []
    }

    // Filter messages to only include those from the user
    const userMessages = (messages as SearchResult[])
        .filter(msg => msg.sender_id === userId)
        .slice(0, limit)

    if (!userMessages || userMessages.length === 0) {
        console.log('No relevant messages found for user:', userId)
        return []
    }

    // Get channel names for context
    const { data: channels } = await context.supabase
        .from('channels')
        .select('id, name')
        .in(
            'id',
            userMessages.map(msg => msg.channel_id),
        )

    const channelMap = (channels || []).reduce(
        (
            acc: Record<string, string>,
            channel: { id: string; name: string },
        ) => ({
            ...acc,
            [channel.id]: channel.name,
        }),
        {} as Record<string, string>,
    )

    // Add channel names to messages
    const messagesWithChannels = userMessages.map(msg => ({
        ...msg,
        channel_name: channelMap[msg.channel_id] || 'unknown-channel',
    }))

    return await enrichMessagesWithSenderInfo(messagesWithChannels, context)
}

async function getChannelMessages(
    channelId: string,
    context: AICommandContext,
    limit = 5,
): Promise<SearchResult[]> {
    const { data: messages, error } = await context.supabase
        .from('messages')
        .select(
            `
            id,
            content,
            sender_id,
            created_at
        `,
        )
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching channel messages:', error)
        return []
    }

    if (!messages || messages.length === 0) {
        return []
    }

    return await enrichMessagesWithSenderInfo(
        messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            sender_id: msg.sender_id!,
            channel_id: channelId,
            channel_name: 'DM Channel',
            created_at: msg.created_at!,
            similarity: 1,
        })),
        context,
    )
}

async function enrichMessagesWithSenderInfo(
    messages: SearchResult[],
    context: AICommandContext,
): Promise<SearchResult[]> {
    const senderIds = [...new Set(messages.map(msg => msg.sender_id))]
    const { data: users } = await context.supabase
        .from('users')
        .select('id, name, email')
        .in('id', senderIds)

    if (!users) return messages

    const userMap = users.reduce(
        (acc: Record<string, (typeof users)[0]>, user: (typeof users)[0]) => ({
            ...acc,
            [user.id]: user,
        }),
        {} as Record<string, (typeof users)[0]>,
    )

    return messages
        .map(msg => ({
            ...msg,
            sender: {
                id: userMap[msg.sender_id].id,
                name: userMap[msg.sender_id].name || 'Unknown',
                email: userMap[msg.sender_id].email,
            },
        }))
        .map(msg => ({ ...msg, content: stripHtml(msg.content) }))
}

async function generateResponse(
    question: string,
    relevantStyleMessages: SearchResult[],
    conversationMessages: SearchResult[],
    originalUserName: string,
    context: AICommandContext,
    systemPrompt: string,
): Promise<string> {
    // Format style context using the same formatting as ask-channel
    const styleContext = relevantStyleMessages
        .map(msg => msg.content)
        .join('\n')

    // Format conversation history
    const conversationHistory = conversationMessages
        .reverse()
        .map(msg => `${msg.sender?.name || 'Unknown'}: ${msg.content}`)
        .join('\n')

    console.log('🔍 Style Context:', styleContext)
    console.log('🔍 Conversation History:', conversationHistory)

    const response = await context.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: systemPrompt
                    .replace('{context}', styleContext)
                    .replace('{conversationHistory}', conversationHistory),
            },
            {
                role: 'user',
                content: `Respond as ${originalUserName}'s Avatar to: ${question}`,
            },
        ],
        temperature: 0.7,
        max_tokens: 500,
    })

    return (
        response.choices[0].message.content ||
        'I apologize, but I was unable to generate a response.'
    )
}
