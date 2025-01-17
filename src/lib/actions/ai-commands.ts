'use server'

import { aiService } from '@/lib/services/ai'
import { createClient } from '@/lib/supabase/server'

/**
 * Handle the /question command by:
 * 1. Getting an AI-generated response using relevant context
 * 2. Creating a new message from the AI bot in the bot's DM channel
 * 3. Revalidating the page to show the new message
 */
export async function handleQuestionCommand(
    question: string,
    channelId: string,
    commandId: string = 'ask-channel',
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
        const aiResponse = await aiService.handleCommand(
            commandId,
            question,
            channelId,
        )

        // For AI bot commands (not avatar commands), send to bot's DM channel
        if (commandId === 'ask-channel' || commandId === 'ask-all-channels') {
            // Get the current user's ID from the auth session
            const session = await supabase.auth.getSession()
            const currentUserId = session.data.session?.user.id
            if (!currentUserId) {
                throw new Error('User not authenticated')
            }

            // Find the DM channel between the current user and the AI bot
            const { data: channels } = await supabase
                .from('channel_members')
                .select('channel_id')
                .eq('user_id', currentUserId)

            if (!channels) {
                throw new Error('Could not find user channels')
            }

            const channelIds = channels.map(c => c.channel_id)
            const { data: botChannels } = await supabase
                .from('channel_members')
                .select('channel_id')
                .eq('user_id', botUser.id)
                .in('channel_id', channelIds)

            if (!botChannels || botChannels.length === 0) {
                throw new Error('Could not find bot DM channel')
            }

            // Get the first DM channel between user and bot
            const { data: dmChannel } = await supabase
                .from('channels')
                .select('id')
                .eq('channel_type', 'direct_message')
                .in(
                    'id',
                    botChannels
                        .map(c => c.channel_id)
                        .filter((id): id is string => id !== null),
                )
                .single()

            if (!dmChannel) {
                throw new Error('Could not find bot DM channel')
            }

            // Create the bot's response message in the DM channel
            const { error: messageError } = await supabase
                .from('messages')
                .insert({
                    content: aiResponse.content,
                    channel_id: dmChannel.id,
                    sender_id: botUser.id,
                    thread_id: null,
                })

            if (messageError) {
                throw messageError
            }
        } else {
            // For avatar commands, send to the original channel
            const { error: messageError } = await supabase
                .from('messages')
                .insert({
                    content: aiResponse.content,
                    channel_id: channelId,
                    sender_id: botUser.id,
                    thread_id: null,
                })

            if (messageError) {
                throw messageError
            }
        }

        return { success: true }
    } catch (error) {
        console.error('Error handling question command:', error)
        throw new Error('Failed to process your question. Please try again.')
    }
}
