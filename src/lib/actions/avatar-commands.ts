'use server'

import { aiService } from '@/lib/services/ai'
import { createClient } from '@/lib/supabase/server'
import type { CommandContext } from '@/lib/services/ai/types'

/**
 * Handle the initial message when a user starts a conversation with an avatar
 */
export async function handleAvatarInitialMessage(
    channelId: string,
    avatarUserId: string,
    currentUserId: string,
) {
    const supabase = await createClient()

    try {
        // Get all user info in parallel
        const [{ data: avatarUser }, { data: currentUser }] = await Promise.all(
            [
                supabase
                    .from('users')
                    .select('id, name, email')
                    .eq('id', avatarUserId)
                    .single(),
                supabase
                    .from('users')
                    .select('id, name')
                    .eq('id', currentUserId)
                    .single(),
            ],
        )

        if (!avatarUser) {
            throw new Error('Avatar user not found')
        }

        if (!currentUser) {
            throw new Error('Current user not found')
        }

        // Extract original user ID from avatar's email
        // Format: avatar-bot-{originalUserId}@chatgenius.internal
        const originalUserId = avatarUser.email
            .split('@')[0]
            .split('avatar-bot-')[1]
        if (!originalUserId) {
            throw new Error(
                'Could not extract original user ID from avatar email',
            )
        }

        // Get original user's info
        const { data: originalUser } = await supabase
            .from('users')
            .select('id, name')
            .eq('id', originalUserId)
            .single()

        // Prepare command context with all available info
        const commandContext: CommandContext = {
            originalUserId,
            originalUserName: originalUser?.name,
            currentUserId,
            currentUserName: currentUser?.name,
        }

        // Get response from AI service
        const aiResponse = await aiService.handleCommand(
            'avatar-initial',
            'Initial greeting',
            channelId,
            commandContext,
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

/**
 * Handle a response from an avatar to a user's message
 */
export async function handleAvatarResponse(
    channelId: string,
    avatarUserId: string,
    currentUserId: string,
    messageContent: string,
) {
    const supabase = await createClient()

    try {
        // Get all user info in parallel
        const [{ data: avatarUser }, { data: currentUser }] = await Promise.all(
            [
                supabase
                    .from('users')
                    .select('id, name, email')
                    .eq('id', avatarUserId)
                    .single(),
                supabase
                    .from('users')
                    .select('id, name')
                    .eq('id', currentUserId)
                    .single(),
            ],
        )

        if (!avatarUser) {
            throw new Error('Avatar user not found')
        }

        if (!currentUser) {
            throw new Error('Current user not found')
        }

        // Extract original user ID from avatar's email
        // Format: avatar-bot-{originalUserId}@chatgenius.internal
        const originalUserId = avatarUser.email
            .split('@')[0]
            .split('avatar-bot-')[1]
        if (!originalUserId) {
            throw new Error(
                'Could not extract original user ID from avatar email',
            )
        }

        // Get original user's info
        const { data: originalUser } = await supabase
            .from('users')
            .select('id, name')
            .eq('id', originalUserId)
            .single()

        // Prepare command context with all available info
        const commandContext = {
            originalUserId,
            originalUserName: originalUser?.name,
            currentUserId,
            currentUserName: currentUser?.name,
        }

        // Get response from AI service
        const aiResponse = await aiService.handleCommand(
            'avatar-response',
            messageContent,
            channelId,
            commandContext,
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
        console.error('Error handling avatar response:', error)
        throw new Error('Failed to generate avatar response. Please try again.')
    }
}
