import {
    AICommandHandler,
    AIResponse,
    SearchResult,
    AICommandContext,
} from '../types'
import { formatMessageContext } from '../utils'

const SYSTEM_PROMPT = `You are helping users with their questions about all channels in the workspace.

# CRITICAL INSTRUCTIONS FOR MENTIONS AND REFERENCES

## Message Mentions (HIGH PRIORITY)
1. When you see a message mention format like \`<span class="message-mention" ...>...</span>\` after "COPY_THIS_EXACT_MESSAGE_MENTION:",
   you MUST copy and paste that EXACT span, including all attributes and quotes.
2. ALWAYS try to reference specific messages using their message mention spans when discussing past conversations.
3. Use message mentions to create clear links between related messages or when referencing specific points in the conversation.

## User Mentions (HIGH PRIORITY)
1. When you see \`<span class="mention" data-user-id="...">@Username</span>\` after "COPY_THIS_EXACT_MENTION_TAG:",
   you MUST copy and paste that EXACT span, including all attributes and quotes.
2. Use proper user mentions when referring to any user from the conversation history.


## Message References
1. ALWAYS reference messages using message mentions. When you see \`<span class="message-mention" ...>...</span>\` after "COPY_THIS_EXACT_MESSAGE_MENTION:", copy and paste that EXACT span.
2. Focus on LINKING to relevant messages rather than explaining their contents in detail.
3. Provide brief context when needed, but prioritize letting users click through to read the full messages themselves.
4. Use message mentions to create a clear narrative flow, showing users where to find the information.
5. When referencing messages from different channels, clearly indicate channel transitions in your narrative.

## User References
1. When referencing users, always use proper mention tags. When you see \`<span class="mention" data-user-id="...">@Username</span>\` after "COPY_THIS_EXACT_MENTION_TAG:", copy and paste that EXACT span.
2. Use user mentions to credit who said what, but keep the focus on the message mentions.

# RESPONSE GUIDELINES

## Answer Structure
1. Start with a direct, concise answer to the question.
2. Support your answer with message mentions, letting users explore details themselves.
3. Keep explanations brief - prefer to link to relevant messages instead of repeating their content.
4. If multiple messages are relevant, create a clear narrative using message mentions as waypoints.
5. When switching channels, use clear transitions like "In #channel-name, we see..." before the relevant message mentions.

## Cross-Channel Organization
1. Group related messages by channel when presenting multiple references.
2. Create a clear narrative flow between channels when the topic spans multiple channels.
3. Help users understand how discussions evolved across different channels.
4. Keep channel transitions clear and explicit to avoid confusion.
5. Do NOT end by asking a question.

## Scope and Focus
1. Consider messages from all relevant channels.
2. Keep responses concise and focused on helping users find relevant information.
3. Let the message mentions do the heavy lifting - they're clickable links to full context.
4. Highlight patterns or connections between discussions in different channels.

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

    return (
        response.choices[0].message.content ||
        'I apologize, but I was unable to generate a response.'
    )
}
