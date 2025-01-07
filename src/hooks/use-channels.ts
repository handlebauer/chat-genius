import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'
import { useStore } from '@/lib/store'

export function useChannels() {
  const supabase = createClientComponentClient<Database>()
  const { channels, setChannels, activeChannelId, setActiveChannelId } = useStore()

  useEffect(() => {
    async function loadChannels() {
      const { data: channelsData, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at')

      if (error) {
        console.error('Error loading channels:', error)
        return
      }

      if (channelsData) {
        setChannels(channelsData)
        // Set default channel if none is selected
        if (!activeChannelId && channelsData.length > 0) {
          setActiveChannelId(channelsData[0].id)
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
          table: 'channels'
        },
        () => {
          // Reload channels when there are changes
          loadChannels()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase, setChannels, activeChannelId, setActiveChannelId])

  return { channels }
}
