import { useEffect, useCallback, useRef } from 'react'
import { useStore } from '@/lib/store'
import { useShallow } from 'zustand/react/shallow'
import { createClient } from '@/lib/supabase/client'
import type { Channel } from '@/lib/store'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type ChannelPayload = {
    id: string
    channel_type: 'channel' | 'direct_message'
    name: string
    created_at: string | null
    created_by: string | null
    is_private: boolean | null
    updated_at: string | null
}

type ChannelMemberPayload = {
    id: string
    user_id: string
    channel_id: string
    created_at: string
}

export function useDMs(
    channelId: string,
    userId: string,
    initialDirectMessages?: Channel[],
) {
    // Use ref to track initialization
    const isInitialized = useRef(false)
    const supabase = createClient()

    const { channels, setChannels } = useStore(
        useShallow(state => ({
            channels: state.channels,
            setChannels: state.setChannels,
        })),
    )

    // Memoize loadDirectMessages to prevent recreation on each render
    const loadDirectMessages = useCallback(
        async (delay = 0) => {
            console.log(
                '[useDMs] Starting loadDirectMessages with delay:',
                delay,
            )

            if (delay > 0) {
                await new Promise(resolve => setTimeout(resolve, delay))
            }

            // First get all DM channels where the user is a member
            const { data: memberChannels, error: membersError } = await supabase
                .from('channel_members')
                .select('channel_id')
                .eq('user_id', userId)

            if (membersError) {
                console.error('[useDMs] Error loading DMs:', membersError)
                return
            }

            console.log('[useDMs] Found channel memberships:', memberChannels)

            if (!memberChannels?.length) {
                console.log('[useDMs] No channel memberships found')
                return
            }

            // Then fetch the actual channels
            const { data: fetchedChannels, error } = await supabase
                .from('channels')
                .select('*')
                .in(
                    'id',
                    memberChannels
                        .map(m => m.channel_id)
                        .filter((id): id is string => id !== null),
                )
                .eq('channel_type', 'direct_message')

            if (error) {
                console.error('[useDMs] Error loading direct messages:', error)
                return
            }

            console.log('[useDMs] Fetched DM channels:', fetchedChannels)

            if (fetchedChannels) {
                // Get current channels from store to ensure we have latest state
                const currentChannels = useStore.getState().channels
                console.log(
                    '[useDMs] Current channels in store:',
                    currentChannels,
                )

                // Create a map of existing DM channels by ID for easy lookup
                const existingDMsById = new Map(
                    currentChannels
                        .filter(c => c.channel_type === 'direct_message')
                        .map(c => [c.id, c]),
                )

                // Create a map of new DM channels
                const newDMsById = new Map(fetchedChannels.map(c => [c.id, c]))

                // Merge the maps, with new channels taking precedence
                const mergedDMs = new Map([...existingDMsById, ...newDMsById])

                // Create the final channel list
                const updatedChannels = [
                    ...currentChannels.filter(
                        c => c.channel_type !== 'direct_message',
                    ),
                    ...Array.from(mergedDMs.values()),
                ]

                console.log(
                    '[useDMs] Setting updated channels:',
                    updatedChannels,
                    'DMs in update:',
                    Array.from(mergedDMs.values()),
                )
                setChannels(updatedChannels)
            }
        },
        [userId, supabase, setChannels],
    )

    // Handle initial data loading
    useEffect(() => {
        if (isInitialized.current) return

        console.log('[useDMs] Initializing DMs for user:', userId)

        if (initialDirectMessages?.length) {
            console.log(
                '[useDMs] Using initial direct messages:',
                initialDirectMessages,
            )
            const currentChannels = useStore.getState().channels

            // Create maps for merging, similar to loadDirectMessages
            const existingDMsById = new Map(
                currentChannels
                    .filter(c => c.channel_type === 'direct_message')
                    .map(c => [c.id, c]),
            )
            const newDMsById = new Map(
                initialDirectMessages.map(c => [c.id, c]),
            )
            const mergedDMs = new Map([...existingDMsById, ...newDMsById])

            const updatedChannels = [
                ...currentChannels.filter(
                    c => c.channel_type !== 'direct_message',
                ),
                ...Array.from(mergedDMs.values()),
            ]

            console.log(
                '[useDMs] Setting channels with initial DMs:',
                updatedChannels,
                'DMs in update:',
                Array.from(mergedDMs.values()),
            )
            setChannels(updatedChannels)
        } else {
            loadDirectMessages()
        }

        isInitialized.current = true
    }, [userId, initialDirectMessages, loadDirectMessages, setChannels])

    // Handle real-time updates in a separate effect
    useEffect(() => {
        console.log(
            '[useDMs] Setting up real-time subscriptions for user:',
            userId,
        )

        // Subscribe to channel_members changes for the current user
        const channelMembersChannel = supabase
            .channel(`dm_member_updates_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'channel_members',
                    filter: `user_id=eq.${userId}`,
                },
                async (
                    payload: RealtimePostgresChangesPayload<ChannelMemberPayload>,
                ) => {
                    try {
                        const newMember =
                            payload.new as ChannelMemberPayload | null
                        console.log(
                            '[useDMs] Channel member INSERT detected for user:',
                            newMember?.user_id,
                            'channel:',
                            newMember?.channel_id,
                            'Full payload:',
                            payload,
                        )
                        await loadDirectMessages(500)
                    } catch (error) {
                        console.error(
                            '[useDMs] Error handling member change:',
                            error,
                        )
                    }
                },
            )
            .subscribe()

        // Subscribe to all channel changes and filter in memory
        const channelsChannel = supabase
            .channel(`dm_channel_updates_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'channels',
                },
                async (
                    payload: RealtimePostgresChangesPayload<ChannelPayload>,
                ) => {
                    try {
                        const newChannel = payload.new as ChannelPayload | null
                        console.log(
                            '[useDMs] Channel INSERT detected:',
                            newChannel,
                        )

                        if (newChannel?.channel_type === 'direct_message') {
                            await loadDirectMessages(500)
                        }
                    } catch (error) {
                        console.error(
                            '[useDMs] Error handling channel change:',
                            error,
                        )
                    }
                },
            )
            .subscribe()

        console.log('[useDMs] Real-time subscriptions set up')

        return () => {
            console.log('[useDMs] Cleaning up subscriptions for user:', userId)
            channelMembersChannel.unsubscribe()
            channelsChannel.unsubscribe()
        }
    }, [userId, loadDirectMessages])

    const directMessages = channels.filter(
        c => c.channel_type === 'direct_message',
    )
    const currentChannel = directMessages.find(dm => dm.id === channelId)

    return {
        directMessages,
        currentChannel,
    }
}
