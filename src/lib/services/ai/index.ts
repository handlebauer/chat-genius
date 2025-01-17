import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import type { AICommandHandler, AIResponse, CommandContext } from './types'
import { askChannelCommand } from './commands/ask-channel'
import { askAllChannelsCommand } from './commands/ask-all-channels'
import { avatarInitial } from './commands/avatar-initial'
import { avatarResponse } from './commands/avatar-response'

export class AIService {
    private openai: OpenAI
    private commands: Map<string, AICommandHandler>

    constructor(apiKey: string) {
        this.openai = new OpenAI({
            apiKey,
        })

        this.commands = new Map([
            ['ask-channel', askChannelCommand],
            ['ask-all-channels', askAllChannelsCommand],
            ['avatar-initial', avatarInitial],
            ['avatar-response', avatarResponse],
        ])
    }

    async handleCommand(
        commandId: string,
        question: string,
        channelId?: string,
        commandContext?: CommandContext,
    ): Promise<AIResponse> {
        const command = this.commands.get(commandId)
        if (!command) {
            throw new Error(`Command ${commandId} not found`)
        }

        const supabase = await createClient()

        try {
            const response = await command.handleQuestion({
                question,
                channelId,
                context: {
                    openai: this.openai,
                    supabase,
                    generateEmbedding: this.generateEmbedding.bind(this),
                },
                commandContext,
            })

            return response
        } catch (error) {
            console.error('Error handling command', commandId, ':', error)
            throw new Error(
                'Failed to process your question. Please try again.',
            )
        }
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        const response = await this.openai.embeddings.create({
            model: 'text-embedding-ada-002',
            input: text,
        })

        return response.data[0].embedding
    }
}

export const aiService = new AIService(process.env.OPENAI_API_KEY || '')
