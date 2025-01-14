import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

interface SearchResult {
    id: string
    content: string
    channel_id: string
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
function createMentionSpan(userId: string, userName: string): string {
    return `<span class="mention mention-text" data-user-id="${userId}" data-name="${userName}">@${userName}</span>`
}

function formatMessageContext(msg: SearchResult): string {
    const userName =
        msg.sender?.name || msg.sender?.email?.split('@')[0] || 'unknown user'
    const userId = msg.sender?.id || msg.sender_id
    const dateInfo = formatRelativeTime(new Date(msg.created_at))
    const mentionSpan = createMentionSpan(userId, userName)

    return `[Previous Message (${dateInfo})] COPY_THIS_EXACT_MENTION_TAG:\`${mentionSpan}\` wrote: ${msg.content} (Similarity: ${(msg.similarity * 100).toFixed(1)}%)`
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

CRITICAL INSTRUCTION ABOUT MENTIONS:
When you see \`<span class="mention" data-user-id="...">@Username</span>\` in the context after "COPY_THIS_EXACT_MENTION_TAG:",
you MUST copy and paste that EXACT span, including all attributes and quotes, when referring to that user.
These spans contain critical metadata that must be preserved exactly as they appear between the backticks.

Other instructions:
1. Use the context provided from previous messages in your response.
2. Include timing information naturally in your responses (e.g., "yesterday", "2 hours ago", "last week", etc.).
3. Include specific dates naturally when relevant (e.g., "on March 15th", "back in January", etc.).
4. Don't take the context as fact; you are simply using it to help answer the user's question.
5. If the context isn't similar enough, tell the user that you don't know the answer.
6. You don't need to offer help with general questions; only answer questions about the current channel.

Here is the relevant context from previous messages in the channel:
{context}

Example of how to use mentions in your response:
If you see: COPY_THIS_EXACT_MENTION_TAG:\`<span class="mention" data-user-id="123">@John</span>\`
You should copy exactly: <span class="mention" data-user-id="123">@John</span> in your response.

Remember:
- Copy mention spans EXACTLY as they appear between backticks - this is critical for the chat system to work
- Include timing information and specific dates naturally
- Combine multiple related messages from the same user when it makes sense`

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

        return await this.enrichMessagesWithSenderInfo(filteredMessages)
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
