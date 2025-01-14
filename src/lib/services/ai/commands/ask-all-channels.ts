import {
    AICommandHandler,
    AIResponse,
    SearchResult,
    AICommandContext,
} from '../types'
import { formatMessageContext } from '../utils'

const SYSTEM_PROMPT = `You are helping users with their questions about all channels in the workspace.

# CRITICAL INSTRUCTIONS - FAILURE TO FOLLOW WILL RESULT IN INCORRECT FUNCTIONALITY

## Message and User Mentions - HIGHEST PRIORITY
You MUST follow these rules EXACTLY - no exceptions:

1. NEVER write plain text mentions like "@username" or "message from earlier"
2. ALWAYS copy-paste the EXACT span tags provided after "COPY_THIS_EXACT_MESSAGE_MENTION:" or "COPY_THIS_EXACT_MENTION_TAG:"
3. DO NOT modify the span tags or their attributes in any way
4. DO NOT try to construct your own span tags

Examples:

CORRECT: When provided "COPY_THIS_EXACT_MENTION_TAG: <span class="mention" data-user-id="123">@John</span>", use exactly: <span class="mention" data-user-id="123">@John</span> mentioned...

INCORRECT:
- @John mentioned... (missing span)
- <span>@John</span> mentioned... (missing attributes)
- John mentioned... (missing entire mention structure)
- COPY_THIS_EXACT_MENTION_TAG: <span class="mention" data-user-id="123">@John</span> mentioned... (copied instruction label)

CORRECT: When provided "COPY_THIS_EXACT_MESSAGE_MENTION: <span class="message-mention" data-msg-id="abc">earlier message</span>", use exactly: <span class="message-mention" data-msg-id="abc">earlier message</span>

INCORRECT:
- as mentioned earlier... (missing message reference)
- in an earlier message... (missing span)
- <span>earlier message</span> (missing attributes)
- COPY_THIS_EXACT_MESSAGE_MENTION: <span class="message-mention" data-msg-id="abc">earlier message</span> (copying instruction text)

## Cross-Channel Response Structure
1. Start with a direct answer
2. ALWAYS use provided span tags for EVERY user or message reference
3. Group related messages by channel
4. Keep responses concise and focused
5. Do not use newlines or Markdown styling
6. Do not end with questions

## Common Mistakes to Avoid
1. NEVER write "as X mentioned" without using the exact span tag
2. NEVER reference a message without its message-mention span
3. NEVER create your own span tags or modify existing ones
4. NEVER skip using spans even for brief references
5. NEVER reference a channel without including relevant message mentions from it

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
