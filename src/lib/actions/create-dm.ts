'use server'

import { createClient } from '@/lib/supabase/server'

export async function createDM(currentUserId: string, otherUserId: string) {
    console.log('[CreateDM] Starting with:', { currentUserId, otherUserId })
    const supabase = await createClient()

    const channelData = {
        name: `dm:${currentUserId}_${otherUserId}`,
        channel_type: 'direct_message',
        is_private: true,
        created_by: currentUserId,
    } as const

    console.info(
        '[CreateDM] Attempting to create channel with data:',
        channelData,
    )

    const { data: channel, error } = await supabase
        .from('channels')
        .insert(channelData)
        .select()
        .single()

    if (error) {
        console.error('[CreateDM] Error creating channel:', error)
        throw new Error(`Failed to create DM channel: ${error.message}`)
    }

    console.log('[CreateDM] Successfully created channel:', channel)
    return channel
}
