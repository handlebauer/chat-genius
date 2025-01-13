'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'

export async function toggleReaction(messageId: string, emoji: string) {
    const start = Date.now()
    const supabase = await createClient()

    try {
        // Get the current user
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser()
        if (userError || !user) throw new Error('Unauthorized')

        // Check if the user has already reacted with this emoji
        const { data: existingReaction } = await supabase
            .from('reactions')
            .select()
            .eq('message_id', messageId)
            .eq('user_id', user.id)
            .eq('emoji', emoji)
            .single()

        let result
        if (existingReaction) {
            // Remove the reaction
            console.log(`[Action] Removing reaction: ${emoji}`)
            result = await supabase
                .from('reactions')
                .delete()
                .eq('message_id', messageId)
                .eq('user_id', user.id)
                .eq('emoji', emoji)
        } else {
            // Add the reaction
            console.log(`[Action] Adding reaction: ${emoji}`)
            result = await supabase.from('reactions').insert({
                message_id: messageId,
                user_id: user.id,
                emoji: emoji,
            })
        }

        if (result.error) throw result.error

        // Revalidate the messages path to update the UI
        revalidatePath('/channels/[channelId]', 'page')

        console.log(`[Action] toggleReaction success: ${Date.now() - start}ms`)
        return { success: true }
    } catch (error) {
        console.error(
            `[Action] toggleReaction error: ${Date.now() - start}ms`,
            error,
        )
        return { success: false, error }
    }
}
