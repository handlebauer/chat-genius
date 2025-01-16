import { useEffect } from 'react'
import { Channel, useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { useShallow } from 'zustand/react/shallow'
import { ChannelMemberships, DMUser } from '@/hooks/use-chat-data'

export function useChatStore(
    channelId: string,
    initialData: {
        channels: Channel[]
        directMessages: Channel[]
        channelMemberships: ChannelMemberships
        dmUsers: Record<string, DMUser>
    },
) {
    const supabase = createClient()

    const {
        setChannels,
        setChannelMemberships,
        setActiveChannelId,
        setDMParticipant,
    } = useStore()
    const activeChannelId = useStore(state => state.activeChannelId)
    const channels = useStore(useShallow(state => state.channels))
    const isHydrated = useStore(state => state.isHydrated)

    useEffect(() => {
        if (!isHydrated) {
            // Combine regular channels and DMs in a single update
            const allChannels = [
                ...initialData.channels,
                ...initialData.directMessages,
            ]
            setChannels(allChannels, true)
            setChannelMemberships(initialData.channelMemberships)

            // Set active channel if not already set
            if (!activeChannelId && channelId) {
                setActiveChannelId(channelId)
            }

            // Initialize DM participants from initial data
            Object.entries(initialData.dmUsers).forEach(([channelId, user]) => {
                setDMParticipant(channelId, {
                    ...user,
                    created_at: null,
                    updated_at: null,
                })
            })
        }
    }, [isHydrated, initialData, channelId, activeChannelId])

    // Subscribe to real-time updates
    useEffect(() => {
        // Only subscribe to updates after hydration
        if (!isHydrated) return

        // Handle real-time channel updates
        const handleChannelUpdate = async (payload?: any) => {
            console.log('[useChatStore] Channel update triggered:', payload)

            const {
                data: { user },
            } = await supabase.auth.getUser()
            if (!user) return

            // First get all channels where the user is a member
            const { data: memberships, error: membershipError } = await supabase
                .from('channel_members')
                .select(
                    'channel_id, role, users!inner (id, name, email, avatar_url)',
                )
                .eq('user_id', user.id)

            if (membershipError) {
                console.error('Error loading memberships:', membershipError)
                return
            }

            if (!memberships?.length) {
                console.log('No channel memberships found')
                return
            }

            // Then fetch the actual channels with their types
            const { data: fetchedChannels, error } = await supabase
                .from('channels')
                .select('*')
                .in(
                    'id',
                    memberships
                        .map(m => m.channel_id)
                        .filter((id): id is string => id !== null),
                )
                .order('created_at')

            if (error) {
                console.error('Error loading channels:', error)
                return
            }

            // For DM channels, fetch all members and their info
            const dmChannels =
                fetchedChannels?.filter(
                    c => c.channel_type === 'direct_message',
                ) || []

            if (dmChannels.length > 0) {
                // For each DM channel, get all members
                const { data: channelMembers, error: membersError } =
                    await supabase
                        .from('channel_members')
                        .select(
                            `
                        channel_id,
                        role,
                        users!inner (
                            id,
                            name,
                            email,
                            avatar_url
                        )
                    `,
                        )
                        .in(
                            'channel_id',
                            dmChannels.map(c => c.id),
                        )

                if (membersError) {
                    console.error('Error loading DM members:', membersError)
                } else if (channelMembers) {
                    // Group members by channel
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
                        {} as Record<string, any[]>,
                    )

                    // Create dmUsers map
                    const dmUsersMap = Object.entries(membersByChannel)
                        .filter(([channelId]) => {
                            const channel = dmChannels.find(
                                c => c.id === channelId,
                            )
                            return channel?.channel_type === 'direct_message'
                        })
                        .reduce(
                            (acc, [channelId, members]) => {
                                // For DMs, find the other user (not the current user)
                                const otherMember = members.find(
                                    m => m.id !== user.id,
                                )
                                if (otherMember) {
                                    acc[channelId] = {
                                        id: otherMember.id,
                                        name: otherMember.name,
                                        email: otherMember.email,
                                        avatar_url: otherMember.avatar_url,
                                        status: null,
                                        lastMessageAt: null,
                                    }
                                }
                                return acc
                            },
                            {} as Record<string, any>,
                        )

                    console.log('[useChatStore] Updating DM users:', dmUsersMap)

                    // Update each DM participant in the store
                    Object.entries(dmUsersMap).forEach(
                        ([channelId, dmUser]) => {
                            useStore
                                .getState()
                                .setDMParticipant(channelId, dmUser)
                        },
                    )
                }
            }

            console.log(
                '[useChatStore] Real-time update - Fetched channels:',
                fetchedChannels?.length,
                'Channel details:',
                fetchedChannels?.map(c => ({
                    id: c.id,
                    type: c.channel_type,
                    name: c.name,
                })),
            )

            if (fetchedChannels) {
                // Get current channels from store to ensure we have latest state
                const currentChannels = useStore.getState().channels

                // Create maps for merging, with channel type in the key for debugging
                const existingChannelsById = new Map(
                    currentChannels.map(c => [`${c.id}-${c.channel_type}`, c]),
                )
                const newChannelsById = new Map(
                    fetchedChannels.map(c => [`${c.id}-${c.channel_type}`, c]),
                )

                // Merge channels, preserving existing data and adding new channels
                const mergedChannels = Array.from(
                    new Map([
                        ...existingChannelsById,
                        ...newChannelsById,
                    ]).values(),
                )

                console.log('[useChatStore] Channel state update:', {
                    current: {
                        total: currentChannels.length,
                        dms: currentChannels.filter(
                            c => c.channel_type === 'direct_message',
                        ).length,
                        channels: currentChannels.filter(
                            c => c.channel_type === 'channel',
                        ).length,
                    },
                    fetched: {
                        total: fetchedChannels.length,
                        dms: fetchedChannels.filter(
                            c => c.channel_type === 'direct_message',
                        ).length,
                        channels: fetchedChannels.filter(
                            c => c.channel_type === 'channel',
                        ).length,
                    },
                    merged: {
                        total: mergedChannels.length,
                        dms: mergedChannels.filter(
                            c => c.channel_type === 'direct_message',
                        ).length,
                        channels: mergedChannels.filter(
                            c => c.channel_type === 'channel',
                        ).length,
                    },
                })

                setChannels(mergedChannels)
            }
        }

        // Handle real-time membership updates
        const handleMembershipUpdate = async (payload?: any) => {
            console.log('[useChatStore] Membership update triggered:', payload)

            const {
                data: { user },
            } = await supabase.auth.getUser()
            if (!user) return

            const { data: memberships, error } = await supabase
                .from('channel_members')
                .select('channel_id')
                .eq('user_id', user.id)

            if (error) {
                console.error('Error loading memberships:', error)
                return
            }

            if (memberships) {
                const membershipMap = memberships.reduce(
                    (acc, { channel_id }) => {
                        if (channel_id) {
                            acc[channel_id] = true
                        }
                        return acc
                    },
                    {} as ChannelMemberships,
                )
                setChannelMemberships(membershipMap)
                // Add a small delay before updating channels to ensure membership is set
                setTimeout(() => handleChannelUpdate(), 100)
            }
        }

        // Subscribe to channel changes
        const channelsChannel = supabase
            .channel('channel_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'channels',
                },
                handleChannelUpdate,
            )
            .subscribe()

        // Subscribe to membership changes
        const membershipsChannel = supabase
            .channel('membership_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'channel_members',
                },
                handleMembershipUpdate,
            )
            .subscribe()

        return () => {
            channelsChannel.unsubscribe()
            membershipsChannel.unsubscribe()
        }
    }, [supabase, setChannels, setChannelMemberships, isHydrated])

    // Update active channel ID when channelId changes
    useEffect(() => {
        if (channelId) {
            setActiveChannelId(channelId)
        }
    }, [channelId, setActiveChannelId])

    // Return derived data
    const currentChannel = channels?.find(channel => channel.id === channelId)
    const regularChannels =
        channels?.filter(c => c.channel_type === 'channel') || []
    const directMessages =
        channels?.filter(c => c.channel_type === 'direct_message') || []

    return {
        channels: regularChannels,
        directMessages,
        currentChannel,
        allChannels: channels || [],
        isHydrated,
    }
}
