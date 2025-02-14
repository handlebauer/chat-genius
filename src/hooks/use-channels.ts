import { useEffect } from 'react'
import { Channel, useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { useShallow } from 'zustand/react/shallow'

export function useChannels(channelId: string, initialChannels?: Channel[]) {
    const supabase = createClient()

    const setChannels = useStore(state => state.setChannels)
    const setActiveChannelId = useStore(state => state.setActiveChannelId)
    const activeChannelId = useStore(state => state.activeChannelId)
    const channels = useStore(useShallow(state => state.channels))

    // Initialize store with server-fetched channels if provided
    useEffect(() => {
        if (initialChannels?.length) {
            setChannels(initialChannels)

            // Set active channel if not already set
            if (!activeChannelId && channelId) {
                setActiveChannelId(channelId)
            }
        }
    }, [
        initialChannels,
        setChannels,
        channelId,
        activeChannelId,
        setActiveChannelId,
    ])

    // Find current channel
    const currentChannel = channels?.find(channel => channel.id === channelId)

    useEffect(() => {
        // Only fetch channels if we don't have any (not initialized from server)
        async function loadChannels() {
            if (channels?.length > 0) return

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
                const noSelectedChannel =
                    !activeChannelId && fetchedChannels.length > 0
                if (noSelectedChannel) {
                    const [channel] = fetchedChannels
                    setActiveChannelId(channel.id)
                }
            }
        }

        loadChannels()

        // Subscribe to channel changes
        const channel = supabase
            .channel('channel_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'channels',
                },
                () => loadChannels(),
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [
        supabase,
        setChannels,
        activeChannelId,
        setActiveChannelId,
        channels?.length,
    ])

    // Always return channels from store, even if empty
    return { channels: channels || [], currentChannel }
}
