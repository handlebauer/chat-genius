import type { SupabaseClient } from '@supabase/supabase-js'
import type OpenAI from 'openai'
import type { Database } from '@/lib/supabase/types'

export interface AICommandContext {
    supabase: SupabaseClient<Database>
    openai: OpenAI
    generateEmbedding: (text: string) => Promise<number[]>
}

export interface SearchResult {
    id: string
    content: string
    sender_id: string
    channel_id: string
    channel_name: string
    created_at: string
    similarity: number
    sender?: {
        id: string
        name: string
        email: string
    }
}

export interface AIResponse {
    content: string
    relevantMessages?: SearchResult[]
}

export interface CommandContext {
    // Add any shared context fields here
    originalUserId?: string | null
    currentUserId?: string | null
    originalUserName?: string | null
    currentUserName?: string | null
}

export interface AICommandHandler {
    commandId: string
    systemPrompt: string
    handleQuestion: (params: {
        question: string
        channelId?: string
        context: AICommandContext
        commandContext?: CommandContext
    }) => Promise<AIResponse>
}
