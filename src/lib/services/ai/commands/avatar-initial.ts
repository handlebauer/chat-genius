import { stripHtml } from '@/components/search-results'
import {
    AICommandContext,
    AICommandHandler,
    AIResponse,
    SearchResult,
} from '../types'

const SYSTEM_PROMPT = `You are an AI avatar that perfectly mirrors the communication style, expertise, and personality of a specific user (the "style user"). Your task is to greet and engage with a different user (the "conversation partner").

You have access to:
1. STYLE_CONTEXT: Recent messages from the style user - study these carefully to mirror their:
   - Exact phrases, emojis, and idioms they frequently use
   - Technical knowledge and how they explain things
   - Level of formality and conversation style

2. USER_CONTEXT: Recent messages from your conversation partner (if available)

Your initial message must:
1. Sound EXACTLY like something the style user would say (use their common phrases/emojis)
2. Be brief (1-3 sentences)
3. If you have user context: Reference a shared interest or recent topic
4. If no user context: Share an insight/topic the style user is passionate about

Style Context:
\`\`\`
{styleContext}
\`\`\`

User Context:
\`\`\`
{userContext}
\`\`\`
`

export const avatarInitial: AICommandHandler = {
    commandId: 'avatar-initial',
    systemPrompt: SYSTEM_PROMPT,

    async handleQuestion({
        question,
        channelId,
        context,
        commandContext,
    }): Promise<AIResponse> {
        if (!channelId) {
            throw new Error('Channel ID is required for avatar-initial command')
        }

        if (!commandContext?.originalUserId) {
            throw new Error('Original user ID is required')
        }

        if (!commandContext?.currentUserId) {
            throw new Error('Current user ID is required')
        }

        // Get messages for both users
        const [originalUserMessages, currentUserMessages] = await Promise.all([
            getUserRecentMessages(commandContext.originalUserId, context),
            getUserRecentMessages(commandContext.currentUserId, context),
        ])

        const response = await generateResponse(
            question,
            originalUserMessages,
            currentUserMessages,
            commandContext.originalUserName || 'User',
            context,
            this.systemPrompt,
        )

        return {
            content: response,
            relevantMessages: [
                ...(originalUserMessages || []),
                ...(currentUserMessages || []),
            ],
        }
    },
}

async function getUserRecentMessages(
    userId: string,
    context: AICommandContext,
    limit = 50,
): Promise<SearchResult[]> {
    console.log('[GetUserRecentMessages] Fetching messages for user:', userId)

    // Get user's recent messages from public channels
    const { data: messages, error } = await context.supabase
        .from('messages')
        .select(
            `
            id,
            content,
            sender_id,
            created_at,
            channels!inner (
                id,
                name,
                is_private
            )
        `,
        )
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching user messages:', error)
        return []
    }

    if (!messages || messages.length === 0) {
        console.log('No messages found for user:', userId)
        return []
    }

    // Transform messages to match SearchResult type
    const searchResults: SearchResult[] = messages.map(
        (msg: {
            id: string
            content: string
            sender_id: string | null
            created_at: string | null
            channels: {
                id: string
                name: string
                is_private: boolean | null
            } | null
        }) => {
            if (!msg.sender_id || !msg.created_at || !msg.channels) {
                throw new Error('Invalid message data')
            }
            return {
                id: msg.id,
                content: msg.content,
                sender_id: msg.sender_id,
                channel_id: msg.channels.id,
                channel_name: msg.channels.name,
                created_at: msg.created_at,
                similarity: 1, // Not using similarity for this use case
            }
        },
    )

    return await enrichMessagesWithSenderInfo(searchResults, context)
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
    originalUserMessages: SearchResult[],
    currentUserMessages: SearchResult[],
    originalUserName: string,
    context: AICommandContext,
    systemPrompt: string,
): Promise<string> {
    const styleContext = originalUserMessages
        .map(msg => msg.content)
        .join('\n\n')

    let userContext = 'NO_CONTEXT_AVAILABLE'
    if (currentUserMessages.length > 0) {
        userContext = currentUserMessages.map(msg => msg.content).join('\n\n')
    }

    console.log('🔍 Style Context:', styleContext)
    console.log('🔍 User Context:', userContext)

    const response = await context.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: systemPrompt
                    .replace('{styleContext}', styleContext)
                    .replace('{userContext}', userContext),
            },
            {
                role: 'user',
                content: `Generate initial greeting as ${originalUserName}'s Avatar${
                    currentUserMessages.length === 0
                        ? ' (no user context available - focus on your interests)'
                        : ''
                }`,
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
