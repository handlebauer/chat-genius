'use server'

import { createClient } from '@/lib/supabase/server'

const DEFAULT_CHANNELS = ['general', 'ai-memes'] as const

export async function joinDefaultChannels(userId: string) {
    console.log('[JoinDefaultChannels] Starting with:', { userId })
    const supabase = await createClient()

    // Get IDs of default channels
    const { data: channels, error: channelsError } = await supabase
        .from('channels')
        .select('id')
        .in('name', DEFAULT_CHANNELS)

    if (channelsError) {
        console.error(
            '[JoinDefaultChannels] Error fetching channels:',
            channelsError,
        )
        throw new Error(
            `Failed to fetch default channels: ${channelsError.message}`,
        )
    }

    if (!channels?.length) {
        console.error('[JoinDefaultChannels] No default channels found')
        return
    }

    // Join each default channel
    const membershipPromises = channels.map(async channel => {
        const { error: membershipError } = await supabase
            .from('channel_members')
            .insert({
                channel_id: channel.id,
                user_id: userId,
                role: 'member',
            })
            .select()
            .single()

        if (membershipError && membershipError.code !== '23505') {
            // Ignore unique violation errors
            console.error(
                `[JoinDefaultChannels] Error joining channel ${channel.id}:`,
                membershipError,
            )
            throw new Error(
                `Failed to join channel ${channel.id}: ${membershipError.message}`,
            )
        }
    })

    await Promise.all(membershipPromises)
    console.log('[JoinDefaultChannels] Successfully joined default channels')
}
