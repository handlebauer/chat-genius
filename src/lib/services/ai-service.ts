import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

interface SearchResult {
    id: string
    content: string
    channel_id: string
    sender_id: string
    created_at: string
    similarity: number
}

interface AIResponse {
    content: string
    relevantMessages?: SearchResult[]
}

// Add logging utility at the top after imports
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

export class AIService {
    private openai: OpenAI
    private supabase: ReturnType<typeof createClient<Database>>

    constructor() {
        // Initialize OpenAI client
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        })

        // Initialize Supabase client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey =
            process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing Supabase environment variables')
        }

        this.supabase = createClient<Database>(supabaseUrl, supabaseServiceKey)
    }

    /**
     * Generate an embedding for the given text using OpenAI's text-embedding-3-small model
     */
    private async generateEmbedding(text: string): Promise<number[]> {
        const response = await this.openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
            encoding_format: 'float',
        })

        return response.data[0].embedding
    }

    /**
     * Search for similar messages in the channel's history
     */
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
        return (messages as SearchResult[]).filter(
            msg => msg.channel_id === channelId,
        )
    }

    /**
     * Generate a response using GPT-4 Turbo with context from similar messages
     */
    private async generateResponse(
        question: string,
        relevantMessages: SearchResult[],
    ): Promise<string> {
        // Format context from relevant messages
        const context = relevantMessages
            .map(
                msg =>
                    `[Previous Message]: ${msg.content} (Similarity: ${(msg.similarity * 100).toFixed(1)}%)`,
            )
            .join('\n')

        const response = await this.openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `You are helping users with their questions about the current channel.
                    1. Use the context provided from previous messages in your response.
                    2. Don't take the context as fact; you are simply using it to help answer the user's question.
                    3. If the context isn't similar enough, tell the user that you don't know the answer.
                    4. You don't need to offer help with general questions; only answer questions about the current channel.

                    Here is the relevant context from previous messages in the channel:
                    ${context}`,
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

    /**
     * Handle a question command from a user
     */
    public async handleQuestion(
        question: string,
        channelId: string,
    ): Promise<AIResponse> {
        try {
            log.info(`Processing question: "${question}"`)

            // Generate embedding for the question
            const embedding = await this.generateEmbedding(question)

            // Search for relevant messages in the channel
            const relevantMessages = await this.searchSimilarMessages(
                embedding,
                channelId,
            )

            // Log the context being used
            log.context(relevantMessages)

            // Generate response using GPT-4 with context
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
