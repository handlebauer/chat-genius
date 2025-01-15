import {
    AICommandContext,
    AICommandHandler,
    AIResponse,
    SearchResult,
} from '../types'
import { formatMessageContext } from '../utils'

const SYSTEM_PROMPT = `You are helping users with their questions about all channels in the workspace.

# CRITICAL INSTRUCTIONS - FAILURE TO FOLLOW WILL RESULT IN INCORRECT FUNCTIONALITY

## Message and User Mentions - HIGHEST PRIORITY
1. NEVER write plain text mentions like "@username" or "message from earlier"
2. ALWAYS copy-paste span tags provided after "COPY_THIS_EXACT_MESSAGE_MENTION:" or "COPY_THIS_EXACT_USER_MENTION:"
3. DO NOT modify span attributes or structure
4. For message mentions: modify ONLY the text content to be a very short (2-5 words) description
5. For user mentions: keep "@Username" exactly as provided

Examples:

CORRECT Message Mentions:
- <span class="message-mention message-mention-text" data-message-id="abc" data-channel-id="123">deployment steps explained</span>
- <span class="message-mention message-mention-text" data-message-id="abc" data-channel-id="123">API rate limits</span>
- <span class="message-mention message-mention-text" data-message-id="abc" data-channel-id="123">bug reproduction steps</span>

INCORRECT Message Mentions:
- deployment steps (missing span)
- <span>deployment steps</span> (missing attributes)
- <span class="message-mention message-mention-text" data-message-id="abc" data-channel-id="123">this message contains a very long and detailed explanation of the deployment steps which...</span> (too verbose)

CORRECT User Mentions:
- <span class="mention" data-user-id="123">@John</span> suggested...
- As noted by <span class="mention" data-user-id="123">@John</span>...

INCORRECT User Mentions:
- @John (missing span)
- John (missing @ and span)
- <span class="mention" data-user-id="123">John</span> (missing @)

## Message Mnetion Flow
1. ALWAYS include message mentions in your response

## Response Guidelines
1. Start with a direct answer
2. Keep message descriptions brief and specific
3. Make transitions between channels natural
4. Write flowing sentences that integrate mentions
5. Keep responses focused and concise
6. Do not use newlines or Markdown

## Common Mistakes to Avoid
1. NEVER skip using proper mention spans
2. NEVER write long descriptions in message spans
3. NEVER modify span attributes or user mentions
4. NEVER use generic descriptions like "earlier message"
5. NEVER reference messages without channel context when needed

Context: {context}`

export const askAllChannelsCommand: AICommandHandler = {
    commandId: 'ask-all-channels',
    systemPrompt: SYSTEM_PROMPT,

    async handleQuestion({ question, context }): Promise<AIResponse> {
        const embedding = await context.generateEmbedding(question)
        const relevantMessages = await searchSimilarMessages(embedding, context)

        const response = await generateResponse(
            question,
            relevantMessages,
            context,
            this.systemPrompt,
        )

        return {
            content: response,
            relevantMessages:
                relevantMessages.length > 0 ? relevantMessages : undefined,
        }
    },
}

async function searchSimilarMessages(
    embedding: number[],
    context: AICommandContext,
    limit = 5,
    similarity_threshold = 0,
): Promise<SearchResult[]> {
    const { data: messages, error } = await context.supabase.rpc(
        'match_messages',
        {
            query_embedding: JSON.stringify(embedding),
            match_threshold: similarity_threshold,
            match_count: limit,
        },
    )

    if (error) {
        console.error('Error searching messages:', error)
        return []
    }

    if (!messages || messages.length === 0) {
        console.log(
            'No messages found with similarity threshold:',
            similarity_threshold,
        )
        return []
    }

    // Get channel names for all messages
    const { data: channels, error: channelsError } = await context.supabase
        .from('channels')
        .select('id, name')
        .in(
            'id',
            (messages as SearchResult[]).map(msg => msg.channel_id),
        )

    if (channelsError) {
        console.error('Error fetching channels:', channelsError)
        return messages as SearchResult[]
    }

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
    const messagesWithChannels = (messages as SearchResult[]).map(msg => ({
        ...msg,
        channel_name: channelMap[msg.channel_id],
    }))

    return await enrichMessagesWithSenderInfo(messagesWithChannels, context)
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

    return messages.map(msg => ({
        ...msg,
        sender: userMap[msg.sender_id],
    }))
}

async function generateResponse(
    question: string,
    relevantMessages: SearchResult[],
    context: AICommandContext,
    systemPrompt: string,
): Promise<string> {
    const messageContext = relevantMessages.map(formatMessageContext).join('\n')

    const response = await context.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: systemPrompt.replace('{context}', messageContext),
            },
            {
                role: 'user',
                content: question,
            },
        ],
        temperature: 0.7,
        max_tokens: 500,
    })

    console.log({ messageContext })

    return (
        response.choices[0].message.content ||
        'I apologize, but I was unable to generate a response.'
    )
}
