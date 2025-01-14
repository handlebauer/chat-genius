export interface SearchResult {
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

export interface AIResponse {
    content: string
    relevantMessages?: SearchResult[]
}

export interface AICommandContext {
    openai: any // Replace with proper OpenAI type
    supabase: any // Replace with proper Supabase client type
    generateEmbedding: (text: string) => Promise<number[]>
}

export interface AICommandHandler {
    commandId: string
    systemPrompt: string
    handleQuestion: (params: {
        question: string
        channelId?: string
        context: AICommandContext
    }) => Promise<AIResponse>
}
