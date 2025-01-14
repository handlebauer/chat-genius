import { useEffect } from 'react'
import { Channel, useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { useShallow } from 'zustand/react/shallow'
import { ChannelMemberships } from './use-chat-data'

export function useChatStore(
    channelId: string,
    initialData?: {
        channels: Channel[]
        directMessages: Channel[]
        channelMemberships: ChannelMemberships
    },
) {
    const supabase = createClient()

    const setChannels = useStore(state => state.setChannels)
    const setChannelMemberships = useStore(state => state.setChannelMemberships)
    const setActiveChannelId = useStore(state => state.setActiveChannelId)
    const activeChannelId = useStore(state => state.activeChannelId)
    const channels = useStore(useShallow(state => state.channels))
    const isHydrated = useStore(state => state.isHydrated)

    // Initialize store with server-fetched data if provided
    useEffect(() => {
        if (initialData && !isHydrated) {
            // Combine regular channels and DMs in a single update
            const allChannels = [
                ...initialData.channels,
                ...initialData.directMessages,
            ]
            setChannels(allChannels, true) // Mark as hydrated
            setChannelMemberships(initialData.channelMemberships)

            // Set active channel if not already set
            if (!activeChannelId && channelId) {
                setActiveChannelId(channelId)
            }
        }
    }, [
        initialData,
        isHydrated,
        setChannels,
        setChannelMemberships,
        channelId,
        activeChannelId,
        setActiveChannelId,
    ])

    // Subscribe to real-time updates
    useEffect(() => {
        // Only subscribe to updates after hydration
        if (!isHydrated) return

        // Handle real-time channel updates
        const handleChannelUpdate = async () => {
            const { data: fetchedChannels, error } = await supabase
                .from('channels')
                .select('*')
                .order('created_at')

            if (error) {
                console.error('Error loading channels:', error)
                return
            }

            if (fetchedChannels) {
                setChannels(fetchedChannels)
            }
        }

        // Handle real-time membership updates
        const handleMembershipUpdate = async () => {
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
