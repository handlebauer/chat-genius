import { useEffect } from 'react'
import { Channel, useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { useShallow } from 'zustand/react/shallow'

export function useDMs(channelId: string, initialDirectMessages?: Channel[]) {
    const supabase = createClient()

    const setChannels = useStore(state => state.setChannels)
    const setActiveChannelId = useStore(state => state.setActiveChannelId)
    const activeChannelId = useStore(state => state.activeChannelId)
    const channels = useStore(useShallow(state => state.channels))

    // Initialize store with server-fetched DMs if provided
    useEffect(() => {
        if (initialDirectMessages?.length) {
            // Merge DMs with existing channels
            setChannels([
                ...channels.filter(c => c.channel_type !== 'direct_message'),
                ...initialDirectMessages,
            ])

            // Set active channel if not already set
            if (!activeChannelId && channelId) {
                setActiveChannelId(channelId)
            }
        }
    }, [
        initialDirectMessages,
        setChannels,
        channelId,
        activeChannelId,
        setActiveChannelId,
        channels,
    ])

    // Find current DM channel
    const currentChannel = channels?.find(
        channel =>
            channel.id === channelId &&
            channel.channel_type === 'direct_message',
    )

    useEffect(() => {
        // Only fetch DMs if we don't have any (not initialized from server)
        async function loadDirectMessages() {
            if (channels?.some(c => c.channel_type === 'direct_message')) return

            const { data: fetchedChannels, error } = await supabase
                .from('channels')
                .select('*')
                .eq('channel_type', 'direct_message')
                .order('created_at')

            if (error) {
                console.error('Error loading direct messages:', error)
                return
            }

            if (fetchedChannels) {
                // Merge DMs with existing channels
                setChannels([
                    ...channels.filter(
                        c => c.channel_type !== 'direct_message',
                    ),
                    ...fetchedChannels,
                ])
                const noSelectedChannel =
                    !activeChannelId && fetchedChannels.length > 0
                if (noSelectedChannel) {
                    const [channel] = fetchedChannels
                    setActiveChannelId(channel.id)
                }
            }
        }

        loadDirectMessages()

        // Subscribe to DM channel changes
        const channel = supabase
            .channel('dm_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'channels',
                    filter: 'channel_type=eq.direct_message',
                },
                () => loadDirectMessages(),
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [supabase, setChannels, activeChannelId, setActiveChannelId, channels])

    // Return only DM channels from the store
    return {
        directMessages:
            channels?.filter(c => c.channel_type === 'direct_message') || [],
        currentChannel,
    }
}
