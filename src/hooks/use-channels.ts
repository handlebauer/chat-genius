import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'
import { useShallow } from 'zustand/react/shallow'

export function useChannels() {
    const supabase = createClient()

    const channels = useStore(useShallow(state => state.channels))
    const setChannels = useStore(state => state.setChannels)
    const activeChannelId = useStore(state => state.activeChannelId)
    const setActiveChannelId = useStore(state => state.setActiveChannelId)

    useEffect(() => {
        async function loadChannels() {
            const { data: channels, error } = await supabase
                .from('channels')
                .select('*')
                .order('created_at')

            if (error) {
                console.error('Error loading channels:', error)
                return
            }

            if (channels) {
                setChannels(channels)
                const noSelectedChannel =
                    !activeChannelId && channels.length > 0
                if (noSelectedChannel) {
                    const [channel] = channels
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
    }, [supabase, setChannels, activeChannelId, setActiveChannelId])

    return { channels }
}
