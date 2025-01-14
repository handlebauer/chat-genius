import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { MENTION_TEMPLATES } from '@/lib/utils/mentions'

interface SearchResult {
    id: string
    content: string
    channel_id: string
    channel_name?: string
    sender_id: string
    sender?: {
        id: string
        name: string | null
        email: string
    }
    created_at: string
    similarity: number
}

interface AIResponse {
    content: string
    relevantMessages?: SearchResult[]
}

// Utility functions for date formatting
function formatRelativeTime(date: Date): string {
    const now = new Date()
    const timeDiff = now.getTime() - date.getTime()
    const secondsDiff = Math.floor(timeDiff / 1000)
    const minutesDiff = Math.floor(secondsDiff / 60)
    const hoursDiff = Math.floor(minutesDiff / 60)
    const daysDiff = Math.floor(hoursDiff / 24)

    if (daysDiff === 0) {
        if (hoursDiff === 0) {
            if (minutesDiff === 0) {
                return 'just now'
            }
            return `${minutesDiff} minutes ago`
        }
        return `${hoursDiff} hours ago`
    } else if (daysDiff === 1) {
        return 'yesterday'
    } else if (daysDiff < 7) {
        return `${daysDiff} days ago`
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined,
    })
}

// Utility functions for mention formatting
function createUserMentionSpan(userId: string, userName: string): string {
    return MENTION_TEMPLATES.USER(userId, userName)
}

function createMessageMentionSpan(
    messageId: string,
    channelId: string,
    channelName: string,
): string {
    return MENTION_TEMPLATES.MESSAGE(messageId, channelId, channelName)
}

function formatMessageContext(msg: SearchResult): string {
    const parts: string[] = []

    // Add timestamp
    const dateInfo = formatRelativeTime(new Date(msg.created_at))
    parts.push(`[Previous Message (${dateInfo})]`)

    // Add user mention if sender info exists
    if (msg.sender_id) {
        const userName =
            msg.sender?.name ||
            msg.sender?.email?.split('@')[0] ||
            'unknown user'
        const userId = msg.sender?.id || msg.sender_id
        const userMention = createUserMentionSpan(userId, userName)
        parts.push(`COPY_THIS_EXACT_MENTION_TAG:\`${userMention}\` wrote`)
    }

    // Add message mention if we have channel info
    if (msg.id && msg.channel_id) {
        const messageMention = createMessageMentionSpan(
            msg.id,
            msg.channel_id,
            msg.channel_name || 'unknown-channel',
        )
        parts.push(`(COPY_THIS_EXACT_MESSAGE_MENTION:\`${messageMention}\`)`)
    }

    // Add content and similarity
    parts.push(msg.content)
    parts.push(`(Similarity: ${(msg.similarity * 100).toFixed(1)}%)`)

    return parts.join(' ')
}

// Logging utility
const log = {
    info: (msg: string) => console.log(`\x1b[36m○\x1b[0m ${msg}`),
    warn: (msg: string) => console.log(`\x1b[33m⚠\x1b[0m ${msg}`),
    success: (msg: string) => console.log(`\x1b[32m✓\x1b[0m ${msg}`),
    error: (msg: string, error?: any) =>
        console.error(`\x1b[31m⨯\x1b[0m ${msg}`, error || ''),
    context: (messages: SearchResult[]) => {
        if (messages.length === 0) {
            console.log('\n\x1b[33m⚠\x1b[0m No relevant context found\n')
            return
        }
        console.log('\n\x1b[35m▶\x1b[0m Context from message history:')
        messages.forEach((msg, i) => {
            const similarity = (msg.similarity * 100).toFixed(1)
            console.log(
                `\n\x1b[36m${i + 1}.\x1b[0m [${similarity}% similar]:\n${msg.content}\n`,
            )
        })
        console.log('─'.repeat(50) + '\n')
    },
}

// System prompt for the AI
const SYSTEM_PROMPT = `You are helping users with their questions about the current channel.

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

# CONTEXT HANDLING

## Using Message History
1. Use the provided context from previous messages to inform your responses.
2. Don't treat the context as absolute fact; use it as supporting information.
3. If the context isn't similar enough, inform the user that you don't have enough information.

## Time and Date References
1. Include timing information naturally (e.g., "yesterday", "2 hours ago", "last week").
2. Use specific dates when relevant (e.g., "on March 15th", "back in January").
3. Maintain chronological clarity when referencing multiple messages.

Context: {context}

# RESPONSE GUIDELINES

## Message Organization
1. Group related messages from the same user when it makes sense.
2. Use message mentions to create a clear narrative flow when discussing multiple messages.
3. Structure your responses to show clear relationships between referenced messages.

## Scope and Focus
1. Focus only on answering questions about the current channel.
2. Don't offer help with general questions outside the channel context.
3. Keep responses relevant to the channel's discussion history.

Here is the relevant context from previous messages in the channel:
{context}

## Example Usage of Mentions:
Message reference:
COPY_THIS_EXACT_MESSAGE_MENTION:\`<span class="message-mention" data-message-id="456">...</span>\`
→ Use exactly: <span class="message-mention" data-message-id="456">...</span>

User reference:
COPY_THIS_EXACT_MENTION_TAG:\`<span class="mention" data-user-id="123">@John</span>\`
→ Use exactly: <span class="mention" data-user-id="123">@John</span>

Remember:
- Message mentions are your primary tool for creating a coherent narrative
- Copy ALL mention spans EXACTLY as they appear between backticks
- Always link related messages using message mentions when possible
- Create clear references to help users navigate the conversation history
- Do not use markdown in your responses`

export class AIService {
    private openai: OpenAI
    private supabase: ReturnType<typeof createClient<Database>>

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        })

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey =
            process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase environment variables')
        }

        this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        const response = await this.openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
            encoding_format: 'float',
        })

        return response.data[0].embedding
    }

    private async searchSimilarMessages(
        embedding: number[],
        channelId: string,
        limit = 5,
        similarity_threshold = 0,
    ): Promise<SearchResult[]> {
        const { data: messages, error } = await this.supabase.rpc(
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
        const { data: channels } = await this.supabase
            .from('channels')
            .select('id, name')
            .in(
                'id',
                filteredMessages.map(msg => msg.channel_id),
            )

        const channelMap = (channels || []).reduce(
            (acc, channel) => ({
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

        return await this.enrichMessagesWithSenderInfo(messagesWithChannels)
    }

    private async enrichMessagesWithSenderInfo(
        messages: SearchResult[],
    ): Promise<SearchResult[]> {
        const senderIds = [...new Set(messages.map(msg => msg.sender_id))]
        const { data: users } = await this.supabase
            .from('users')
            .select('id, name, email')
            .in('id', senderIds)

        if (!users) return messages

        const userMap = users.reduce(
            (acc, user) => ({
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

    private async generateResponse(
        question: string,
        relevantMessages: SearchResult[],
    ): Promise<string> {
        const context = relevantMessages.map(formatMessageContext).join('\n')

        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: SYSTEM_PROMPT.replace('{context}', context),
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

    public async handleQuestion(
        question: string,
        channelId: string,
    ): Promise<AIResponse> {
        try {
            log.info(`Processing question: "${question}"`)

            const embedding = await this.generateEmbedding(question)
            const relevantMessages = await this.searchSimilarMessages(
                embedding,
                channelId,
            )

            log.context(relevantMessages)

            const response = await this.generateResponse(
                question,
                relevantMessages,
            )

            return {
                content: response,
                relevantMessages:
                    relevantMessages.length > 0 ? relevantMessages : undefined,
            }
        } catch (error) {
            log.error('Error handling question:', error)
            throw new Error(
                'Failed to process your question. Please try again.',
            )
        }
    }
}

// Export a singleton instance
export const aiService = new AIService()
