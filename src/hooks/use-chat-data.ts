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
    [channelId: string]: {
        role: 'owner' | 'admin' | 'member'
    }
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
        supabase.from('channels').select('*').order('created_at'),
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase
            .from('channel_members')
            .select(
                `
                channel_id,
                role,
                user_id,
                users!inner (
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

    // Log any errors for debugging
    if (membersError) {
        console.error('Error fetching channel members:', membersError)
    }

    if (!channels || !userData || !channelMembers) return null

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

    // Group members by channel for easier access
    const membersByChannel = channelMembers.reduce(
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

    // Create a map of DM users with their last message timestamp
    const dmUsersMap = Object.entries(membersByChannel)
        .filter(([channelId]) => {
            const channel = channels.find(c => c.id === channelId)
            return channel?.channel_type === 'direct_message'
        })
        .reduce(
            (acc, [channelId, members]) => {
                // For DMs, find the other user (not the current user)
                const otherMember = members.find(m => m.id !== user.id)
                if (otherMember) {
                    acc[channelId] = {
                        id: otherMember.id,
                        name: otherMember.name,
                        email: otherMember.email,
                        avatar_url: otherMember.avatar_url,
                        status: null, // We'll need to get this from presence data
                        lastMessageAt: lastMessageByChannel[channelId] || null,
                    }
                }
                return acc
            },
            {} as Record<string, DMUser>,
        )

    // Convert user memberships to a Record for easier lookup
    const channelMemberships = (userMemberships || []).reduce(
        (acc, membership) => {
            if (membership.channel_id) {
                acc[membership.channel_id] = {
                    role: membership.role,
                }
            }
            return acc
        },
        {} as ChannelMemberships,
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
