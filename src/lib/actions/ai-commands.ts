'use server'

import { aiService } from '@/lib/services/ai-service'
import { createClient } from '@/lib/supabase/server'

/**
 * Handle the /question command by:
 * 1. Getting an AI-generated response using relevant context
 * 2. Creating a new message from the AI bot
 * 3. Revalidating the page to show the new message
 */
export async function handleQuestionCommand(
    question: string,
    channelId: string,
    // userId: string,
) {
    const supabase = await createClient()

    try {
        // Get the AI bot's user ID
        const { data: botUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', 'ai-bot@test.com')
            .single()

        if (!botUser) {
            throw new Error('AI bot user not found')
        }

        // Get response from AI service
        const aiResponse = await aiService.handleQuestion(question, channelId)

        // Create the bot's response message
        const { error: messageError } = await supabase.from('messages').insert({
            content: aiResponse.content,
            channel_id: channelId,
            sender_id: botUser.id,
            // If we have relevant messages, store their IDs for potential future use
            thread_id: null, // For now, not starting a thread
        })

        if (messageError) {
            throw messageError
        }

        return { success: true }
    } catch (error) {
        console.error('Error handling question command:', error)
        throw new Error('Failed to process your question. Please try again.')
    }
}
