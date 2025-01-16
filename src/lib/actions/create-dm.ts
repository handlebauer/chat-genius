'use server'

import { createClient } from '@/lib/supabase/server'

export async function createDM(currentUserId: string, otherUserId: string) {
    console.log('[CreateDM] Starting with:', { currentUserId, otherUserId })
    const supabase = await createClient()

    // First check if a DM channel already exists between these users
    console.log('[CreateDM] Checking for existing DM channel')

    // First get channels where otherUser is a member
    const { data: otherUserChannels } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', otherUserId)
        .eq('role', 'member')

    if (!otherUserChannels?.length) {
        console.log('[CreateDM] No channels found for other user')
        // No channels found for other user, so no existing DM
    } else {
        const channelIds = otherUserChannels
            .filter(c => c.channel_id !== null)
            .map(c => c.channel_id as string)

        // Now check if currentUser is in any of these channels
        const { data: existingChannelMembers } = await supabase
            .from('channel_members')
            .select('channel_id')
            .eq('user_id', currentUserId)
            .eq('role', 'member')
            .in('channel_id', channelIds)

        console.log(
            '[CreateDM] Existing channel members found:',
            existingChannelMembers,
        )

        if (existingChannelMembers?.length) {
            // Get the first matching channel's details
            const { data: existingChannel } = await supabase
                .from('channels')
                .select()
                .eq('id', existingChannelMembers[0].channel_id!)
                .eq('channel_type', 'direct_message')
                .single()

            if (existingChannel) {
                console.log(
                    '[CreateDM] Found existing channel:',
                    existingChannel,
                )
                return existingChannel
            }
        }
    }

    // Create new DM channel
    const channelData = {
        name: `DM ${Date.now()}`, // Simple unique name
        channel_type: 'direct_message',
        is_private: true,
        created_by: currentUserId,
    } as const

    console.info(
        '[CreateDM] Attempting to create channel with data:',
        channelData,
    )

    const { data: channel, error: channelError } = await supabase
        .from('channels')
        .insert(channelData)
        .select()
        .single()

    if (channelError) {
        console.error('[CreateDM] Error creating channel:', channelError)
        throw new Error(`Failed to create DM channel: ${channelError.message}`)
    }

    // Add both users as members
    const { error: membersError } = await supabase
        .from('channel_members')
        .insert([
            { channel_id: channel.id, user_id: currentUserId, role: 'member' },
            { channel_id: channel.id, user_id: otherUserId, role: 'member' },
        ])

    if (membersError) {
        console.error('[CreateDM] Error adding members:', membersError)
        // Clean up the channel since member creation failed
        await supabase.from('channels').delete().eq('id', channel.id)
        throw new Error(
            `Failed to add members to DM channel: ${membersError.message}`,
        )
    }

    console.log(
        '[CreateDM] Successfully created channel with members:',
        channel,
    )
    return channel
}
