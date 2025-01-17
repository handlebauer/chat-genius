'use server'

import { aiService } from '@/lib/services/ai'
import { createClient } from '@/lib/supabase/server'

/**
 * Handle the initial message when a user starts a conversation with an avatar
 */
export async function handleAvatarInitialMessage(
    channelId: string,
    userId: string,
) {
    const supabase = await createClient()

    try {
        // Get the avatar's user ID (the one with the internal email)
        const { data: avatarUser } = await supabase
            .from('users')
            .select('id, name')
            .eq('id', userId)
            .single()

        if (!avatarUser) {
            throw new Error('Avatar user not found')
        }

        // Get response from AI service
        const aiResponse = await aiService.handleCommand(
            'avatar-initial',
            `Initial greeting as ${avatarUser.name}`,
            channelId,
        )

        // Create the avatar's response message
        const { error: messageError } = await supabase.from('messages').insert({
            content: aiResponse.content,
            channel_id: channelId,
            sender_id: avatarUser.id,
            thread_id: null,
        })

        if (messageError) {
            throw messageError
        }

        return { success: true }
    } catch (error) {
        console.error('Error handling avatar initial message:', error)
        throw new Error(
            'Failed to start avatar conversation. Please try again.',
        )
    }
}
