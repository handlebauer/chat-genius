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

export interface DMUser {
    id: string
    name: string | null
    email: string
    avatar_url: string | null
    status: string | null
    lastMessageAt?: string | null
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

    // Get all DM participant IDs and their channels
    const dmParticipantIds = new Set<string>()
    const dmChannelsByParticipant: Record<string, string[]> = {}

    channels
        .filter(c => c.channel_type === 'direct_message')
        .forEach(channel => {
            const [, participants] = channel.name.split(':')
            const [user1, user2] = participants.split('_')
            if (user1 !== user.id) {
                dmParticipantIds.add(user1)
                dmChannelsByParticipant[user1] =
                    dmChannelsByParticipant[user1] || []
                dmChannelsByParticipant[user1].push(channel.id)
            }
            if (user2 !== user.id) {
                dmParticipantIds.add(user2)
                dmChannelsByParticipant[user2] =
                    dmChannelsByParticipant[user2] || []
                dmChannelsByParticipant[user2].push(channel.id)
            }
        })

    // Fetch complete user data for all DM participants
    const { data: dmUsers } = await supabase
        .from('users')
        .select('id, name, email, avatar_url, status')
        .in('id', Array.from(dmParticipantIds))

    // Fetch most recent message for each DM channel
    const { data: lastMessages } = await supabase
        .from('messages')
        .select('channel_id, created_at')
        .in(
            'channel_id',
            channels
                .filter(c => c.channel_type === 'direct_message')
                .map(c => c.id),
        )
        .order('created_at', { ascending: false })

    // Create a map of channel IDs to their last message timestamp
    const lastMessageByChannel = (lastMessages || []).reduce(
        (acc, msg) => {
            if (
                msg.channel_id &&
                msg.created_at &&
                (!acc[msg.channel_id] || msg.created_at > acc[msg.channel_id])
            ) {
                acc[msg.channel_id] = msg.created_at
            }
            return acc
        },
        {} as Record<string, string>,
    )

    // Create a map of DM users with their last message timestamp
    const dmUsersMap = (dmUsers || []).reduce(
        (acc, user) => {
            if (!user.id) return acc

            const userChannels = dmChannelsByParticipant[user.id] || []
            const lastMessageAt = userChannels.reduce(
                (latest, channelId) => {
                    const timestamp = lastMessageByChannel[channelId]
                    return timestamp && (!latest || timestamp > latest)
                        ? timestamp
                        : latest
                },
                null as string | null,
            )

            acc[user.id] = {
                ...user,
                lastMessageAt,
            }
            return acc
        },
        {} as Record<string, DMUser>,
    )

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
        dmUsers: dmUsersMap,
    }
}
