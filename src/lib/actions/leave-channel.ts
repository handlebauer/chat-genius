'use server'

import { createClient } from '@/lib/supabase/server'

export async function leaveChannel(channelId: string, userId: string) {
    console.log('[LeaveChannel] Starting with:', { channelId, userId })
    const supabase = await createClient()

    // Check if user is the owner
    const { data: membership, error: membershipError } = await supabase
        .from('channel_members')
        .select('role')
        .eq('channel_id', channelId)
        .eq('user_id', userId)
        .single()

    if (membershipError) {
        console.error(
            '[LeaveChannel] Error checking membership:',
            membershipError,
        )
        throw new Error(
            `Failed to check membership: ${membershipError.message}`,
        )
    }

    // Don't allow owners to leave their channels
    if (membership?.role === 'owner') {
        throw new Error('Channel owners cannot leave their channels')
    }

    // Delete the membership
    const { error: deleteError } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', userId)

    if (deleteError) {
        console.error('[LeaveChannel] Error leaving channel:', deleteError)
        throw new Error(`Failed to leave channel: ${deleteError.message}`)
    }

    console.log('[LeaveChannel] Successfully left channel')
}
