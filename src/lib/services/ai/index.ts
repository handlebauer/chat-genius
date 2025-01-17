import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { AICommandHandler, AIResponse } from './types'
import { askChannelCommand } from './commands/ask-channel'
import { askAllChannelsCommand } from './commands/ask-all-channels'
import { avatarInitial } from './commands/avatar-initial'

export class AIService {
    private openai: OpenAI
    private supabase: ReturnType<typeof createClient<Database>>
    private commands: Map<string, AICommandHandler>

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

        // Register commands
        this.commands = new Map([
            ['ask-channel', askChannelCommand],
            ['ask-all-channels', askAllChannelsCommand],
            ['avatar-initial', avatarInitial],
        ])
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        const response = await this.openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: text,
            encoding_format: 'float',
        })

        return response.data[0].embedding
    }

    public async handleCommand(
        commandId: string,
        question: string,
        channelId?: string,
    ): Promise<AIResponse> {
        const command = this.commands.get(commandId)
        if (!command) {
            throw new Error(`Unknown command: ${commandId}`)
        }

        const context = {
            openai: this.openai,
            supabase: this.supabase,
            generateEmbedding: this.generateEmbedding.bind(this),
        }

        try {
            return await command.handleQuestion({
                question,
                channelId,
                context,
            })
        } catch (error) {
            console.error(`Error handling command ${commandId}:`, error)
            throw new Error(
                'Failed to process your question. Please try again.',
            )
        }
    }
}

// Export a singleton instance
export const aiService = new AIService()
