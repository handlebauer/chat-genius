import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { Database } from '@/lib/supabase/types'

export interface ChannelMember {
    id: string
    name: string | null
    email: string
    avatar_url: string | null
    role: 'owner' | 'admin' | 'member'
}

export interface ChannelMemberships {
    [channelId: string]: boolean
}

interface ChannelMemberResponse {
    channel_id: string
    role: 'owner' | 'admin' | 'member'
    users: {
        id: string
        name: string | null
        email: string
        avatar_url: string | null
    }
}

export async function useChatData(user: User, channelId: string) {
    const supabase = await createClient()

    const [
        channelsResponse,
        userResponse,
        channelMembersResponse,
        userMembershipsResponse,
    ] = await Promise.all([
        supabase
            .from('channels')
            .select('*')
            .or(
                `channel_type.eq.channel,and(channel_type.eq.direct_message,or(name.ilike.dm:${user.id}_%,name.ilike.dm:%_${user.id}))`,
            )
            .order('created_at'),
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase
            .from('channel_members')
            .select(
                `
                channel_id,
                role,
                users:user_id (
                    id,
                    name,
                    email,
                    avatar_url
                )
            `,
            )
            .returns<ChannelMemberResponse[]>(),
        // Fetch user's channel memberships
        supabase
            .from('channel_members')
            .select('channel_id, role')
            .eq('user_id', user.id),
    ])

    const [
        { data: channels, error: channelsError },
        { data: userData, error: userError },
        { data: channelMembers, error: membersError },
        { data: userMemberships, error: userMembershipsError },
    ] = [
        channelsResponse,
        userResponse,
        channelMembersResponse,
        userMembershipsResponse,
    ]

    if (!channels || !userData || !channelMembers) return null

    // Convert user memberships to a Record for easier lookup
    const channelMemberships = (userMemberships || []).reduce(
        (acc, membership) => {
            if (membership.channel_id) {
                acc[membership.channel_id] = true
            }
            return acc
        },
        {} as ChannelMemberships,
    )

    // Group members by channel for easier access
    const membersByChannel = (channelMembers as ChannelMemberResponse[]).reduce(
        (acc, member) => {
            const channelId = member.channel_id
            if (channelId) {
                if (!acc[channelId]) {
                    acc[channelId] = []
                }
                if (member.users) {
                    acc[channelId].push({
                        ...member.users,
                        role: member.role,
                    })
                }
            }
            return acc
        },
        {} as Record<string, ChannelMember[]>,
    )

    const currentChannel = channels.find(channel => channel.id === channelId)

    if (!currentChannel) return null

    const currentChannelMembers = membersByChannel[currentChannel.id] || []

    // Split channels and DMs for the UI
    const regularChannels = channels.filter(c => c.channel_type === 'channel')
    const directMessages = channels.filter(
        c => c.channel_type === 'direct_message',
    )

    return {
        channels: regularChannels,
        userData,
        directMessages,
        currentChannel,
        currentChannelMembers,
        channelMemberships,
    }
}
