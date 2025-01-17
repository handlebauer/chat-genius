import { createClient } from '@/lib/supabase/server'
import type { AICommandHandler, AIResponse } from '../types'

export const avatarInitial: AICommandHandler = {
    commandId: 'avatar-initial',
    systemPrompt: 'You are an AI avatar having a friendly conversation.',
    handleQuestion: async ({ question, channelId }) => {
        // For now, just return a simple greeting
        // In a real implementation, this would use an LLM to generate a more contextual response
        const response: AIResponse = {
            content:
                "👋 Hi! I'm your AI avatar. I'm here to chat and help you explore ideas. What's on your mind?",
            relevantMessages: [],
        }
        return response
    },
}
