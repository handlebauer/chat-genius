'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { botUserConfig, config } from '@/config'
import type { Database } from '@/lib/supabase/types'

const DEFAULT_CHANNELS =
    config.NODE_ENV === 'production'
        ? ['hello']
        : (['general', 'ai-test', 'hello'] as const)

async function createBotDmChannel(userId: string, botUserId: string) {
    console.log('[CreateBotDmChannel] Starting with:', { userId, botUserId })

    // Use service role client for bot operations
    const serviceClient = createServiceClient<Database>(
        config.NEXT_PUBLIC_SUPABASE_URL,
        config.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
    )

    // Create DM channel
    const { data: channel, error: channelError } = await serviceClient
        .from('channels')
        .insert({
            name: `${userId}_${botUserId}`,
            channel_type: 'direct_message',
            created_by: botUserId,
            is_private: true,
        })
        .select()
        .single()

    if (channelError) {
        console.error(
            '[CreateBotDmChannel] Error creating channel:',
            channelError,
        )
        throw new Error(`Failed to create DM channel: ${channelError.message}`)
    }

    // Add both users to the channel using service role client
    const membershipPromises = [userId, botUserId].map(async memberId => {
        const { error: membershipError } = await serviceClient
            .from('channel_members')
            .insert({
                channel_id: channel.id,
                user_id: memberId,
                role: 'member',
            })
            .select()
            .single()

        if (membershipError && membershipError.code !== '23505') {
            console.error(
                `[CreateBotDmChannel] Error adding member ${memberId}:`,
                membershipError,
            )
            throw new Error(
                `Failed to add member to DM channel: ${membershipError.message}`,
            )
        }
    })

    await Promise.all(membershipPromises)
    console.log(
        '[CreateBotDmChannel] Successfully created DM channel:',
        channel.id,
    )
}

export async function joinDefaultChannels(userId: string) {
    console.log('[JoinDefaultChannels] Starting with:', { userId })
    const supabase = await createClient()
    const serviceClient = createServiceClient<Database>(
        config.NEXT_PUBLIC_SUPABASE_URL,
        config.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY,
    )

    // Get bot user ID using service role client
    const { data: botUser, error: botUserError } = await serviceClient
        .from('users')
        .select('id')
        .eq('email', botUserConfig.email)
        .single()

    if (botUserError) {
        console.error(
            '[JoinDefaultChannels] Error fetching bot user:',
            botUserError,
        )
        throw new Error(`Failed to fetch bot user: ${botUserError.message}`)
    }

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

    // Create DM channel with bot user
    await createBotDmChannel(userId, botUser.id)
}
