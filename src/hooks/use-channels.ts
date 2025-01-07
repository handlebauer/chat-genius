import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

type Channel = Database['public']['Tables']['channels']['Row']

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    async function loadChannels() {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error loading channels:', error)
        return
      }

      setChannels(data)
      // Set initial channel to #general
      const generalChannel = data.find(channel => channel.name === 'general')
      if (generalChannel) {
        setCurrentChannel(generalChannel)
      }
    }

    loadChannels()
  }, [supabase])

  const handleChannelSelect = (channel: Channel) => {
    setCurrentChannel(channel)
  }

  return {
    channels,
    currentChannel,
    handleChannelSelect,
  }
}
