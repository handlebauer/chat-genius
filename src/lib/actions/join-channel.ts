'use server'

import { createClient } from '@/lib/supabase/server'

export async function joinChannel(channelId: string, userId: string) {
    console.log('[JoinChannel] Starting with:', { channelId, userId })
    const supabase = await createClient()

    // Check if channel is private
    const { data: channel, error: channelError } = await supabase
        .from('channels')
        .select('is_private')
        .eq('id', channelId)
        .single()

    if (channelError) {
        console.error('[JoinChannel] Error checking channel:', channelError)
        throw new Error(`Failed to check channel: ${channelError.message}`)
    }

    if (channel.is_private) {
        throw new Error('Cannot join private channels directly')
    }

    // Join the channel as a member
    const { error: joinError } = await supabase
        .from('channel_members')
        .insert({
            channel_id: channelId,
            user_id: userId,
            role: 'member',
        })
        .select()
        .single()

    if (joinError) {
        console.error('[JoinChannel] Error joining channel:', joinError)
        throw new Error(`Failed to join channel: ${joinError.message}`)
    }

    console.log('[JoinChannel] Successfully joined channel')
}
