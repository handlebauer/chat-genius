'use client'

import { useEffect } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useUserData } from '@/hooks/use-user-data'
import { Database } from '@/lib/supabase/types'
import { useStore } from '@/lib/store'

interface OnlineUsersProps {
  userId: string
}

export function useOnlineUsers({ userId }: OnlineUsersProps) {
  const supabase = createClientComponentClient<Database>()
  const { onlineUsers, setOnlineUsers } = useStore()
  const user = useUserData(userId)

  useEffect(() => {
    if (!user) return

    // Create and subscribe to the presence channel
    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    // Handle presence state changes
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const currentOnlineUsers = Object.values(state).flat().map((presence: any) => ({
        id: presence.user_id,
        email: presence.email,
        name: presence.name,
        last_seen: new Date().toISOString(),
      }))
      setOnlineUsers(currentOnlineUsers)
    })

    // Subscribe to the channel
    channel
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            email: user.email,
            name: user.name,
            last_seen: new Date().toISOString(),
          })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [user, supabase, setOnlineUsers])

  return { onlineUsers }
}
