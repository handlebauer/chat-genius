import {
    AICommandHandler,
    AIResponse,
    SearchResult,
    AICommandContext,
} from '../types'
import { formatMessageContext } from '../utils'

const SYSTEM_PROMPT = `You are helping users with their questions about the current channel.

# CRITICAL INSTRUCTIONS - FAILURE TO FOLLOW WILL RESULT IN INCORRECT FUNCTIONALITY

## Message and User Mentions - HIGHEST PRIORITY
You MUST follow these rules EXACTLY - no exceptions:

1. NEVER write plain text mentions like "@username" or "message from earlier"
2. ALWAYS copy-paste the EXACT span tags provided after "COPY_THIS_EXACT_MESSAGE_MENTION:" or "COPY_THIS_EXACT_USER_MENTION:"
3. DO NOT modify the span tags or their attributes in any way
4. For message mentions: modify ONLY the text content to be a very short (2-5 words) description
5. For user mentions: NEVER modify the content, keep "@Username" exactly as provided
6. Keep ALL span structures and attributes exactly as provided
7. Integrate message mentions naturally into your sentences - don't just prefix them

Examples:

CORRECT Message Flow:
- "The issue was resolved using <span class="message-mention message-mention-text" data-msg-id="abc">nginx config fix</span>"
- "<span class="mention" data-user-id="123">@John</span> implemented the <span class="message-mention message-mention-text" data-msg-id="abc">database schema changes</span>"
- "We can solve this using the <span class="message-mention message-mention-text" data-msg-id="abc">caching strategy</span> approach"

INCORRECT Message Flow:
- "<span class="message-mention message-mention-text" data-msg-id="abc" data-channel-id="123">nginx config solution</span> This fixes the issue"
- "<span class="message-mention message-mention-text" data-msg-id="abc" data-channel-id="123">database changes</span> As John mentioned"
- "The solution is here: <span class="message-mention message-mention-text" data-msg-id="abc" data-channel-id="123">fix steps</span>"

CORRECT User Mentions: When provided "COPY_THIS_EXACT_USER_MENTION: <span class="mention" data-user-id="123">@John</span>", use exactly:
- <span class="mention" data-user-id="123" data-user-name="John">@John</span> asked about...
- As discussed by <span class="mention" data-user-id="123" data-user-name="John">@John</span>...

INCORRECT User Mentions:
- @John (missing span)
- <span>@John</span> (missing attributes)
- <span class="mention" data-user-id="123">John</span> (removed @ symbol)
- John mentioned... (missing entire mention structure)

CORRECT Message Mentions: When provided "COPY_THIS_EXACT_MESSAGE_MENTION: <span class="message-mention message-mention-text" data-msg-id="abc">earlier message</span>", modify only the inner text:
- <span class="message-mention message-mention-text" data-msg-id="abc" data-channel-id="123">deployment steps explained</span>
- <span class="message-mention message-mention-text" data-msg-id="abc" data-channel-id="123">bug reproduction steps</span>
- <span class="message-mention message-mention-text" data-msg-id="abc" data-channel-id="123">API rate limits</span>

INCORRECT Message Mentions:
- <span>deployment steps</span> (missing attributes)
- deployment steps explained (missing span)
- <span class="message-mention message-mention-text" data-channel-id="123">steps</span> (missing data-msg-id)
- <span class="message-mention message-mention-text" data-msg-id="abc">steps</span> (missing data-channel-id)
- <span class="message-mention message-mention-text" data-msg-id="different-id" data-channel-id="different-id">steps</span> (modified attributes)
- <span class="message-mention message-mention-text" data-msg-id="abc" data-channel-id="123">this message contains a very long and detailed explanation of the deployment steps which...</span> (too verbose)

## Response Structure
1. Start with a direct answer
2. Use message mentions with concise (2-5 words) descriptions of the content
3. Always use proper user mentions when referencing users
4. Integrate mentions naturally into your sentences
5. Keep responses focused and brief
6. Do not use newlines or Markdown styling
7. Do not end with questions

## Message Content Guidelines
1. Inside message spans, use clear but very brief descriptions: "feature request details" not "earlier message"
2. Make descriptions actionable: "database setup steps" not "info about database"
3. Be specific but concise: "API auth error fix" not "solution"
4. Avoid generic descriptions like "earlier message" or "response"
5. Keep descriptions under 5 words
6. Write sentences that flow naturally with the message mentions
7. Position mentions where they make sense grammatically

## Common Mistakes to Avoid
1. NEVER write descriptions outside the spans
2. NEVER modify span attributes or structure
3. NEVER write long descriptions inside message spans
4. NEVER use generic descriptions like "message" or "response"
5. NEVER skip using spans for any message or user reference
6. NEVER modify user mention content - keep exactly as provided
7. NEVER refer to users without their proper mention spans
8. NEVER start sentences with message mentions unless it flows naturally
9. NEVER tack on message mentions at the end of sentences without proper integration

Context: {context}`

export const askChannelCommand: AICommandHandler = {
    commandId: 'ask-channel',
    systemPrompt: SYSTEM_PROMPT,

    async handleQuestion({
        question,
        channelId,
        context,
    }): Promise<AIResponse> {
        if (!channelId) {
            throw new Error('Channel ID is required for ask-channel command')
        }

        const embedding = await context.generateEmbedding(question)
        const relevantMessages = await searchSimilarMessages(
            embedding,
            channelId,
            context,
        )

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
    channelId: string,
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

    // Filter messages to only include those from the current channel
    const filteredMessages = (messages as SearchResult[]).filter(
        msg => msg.channel_id === channelId,
    )

    // Get channel names
    const { data: channels } = await context.supabase
        .from('channels')
        .select('id, name')
        .in(
            'id',
            filteredMessages.map(msg => msg.channel_id),
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
    const messagesWithChannels = filteredMessages.map(msg => ({
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

    console.log({
        messageContext,
    })

    return (
        response.choices[0].message.content ||
        'I apologize, but I was unable to generate a response.'
    )
}
