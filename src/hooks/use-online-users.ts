'use client'

import { useEffect, useCallback, useRef } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useUserData } from '@/hooks/use-user-data'
import { Database } from '@/lib/supabase/types'
import { useStore } from '@/lib/store'

interface OnlineUsersProps {
  userId: string
}

const AWAY_TIMEOUT = 30000 // 30 seconds in milliseconds

export function useOnlineUsers({ userId }: OnlineUsersProps) {
  const supabase = createClientComponentClient<Database>()
  const { onlineUsers, setOnlineUsers } = useStore()
  const user = useUserData(userId)
  const lastActivityRef = useRef(new Date().toISOString())
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Track user activity
  const updateActivity = useCallback(() => {
    lastActivityRef.current = new Date().toISOString()

    // Update presence with new activity timestamp
    if (channelRef.current) {
      channelRef.current.track({
        user_id: user?.id,
        email: user?.email,
        name: user?.name,
        last_seen: new Date().toISOString(),
        last_active: lastActivityRef.current,
        status: 'online'
      })
    }
  }, [user])

  // Set up activity listeners
  useEffect(() => {
    if (typeof window === 'undefined') return

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart']
    const handleActivity = () => {
      updateActivity()
    }

    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    // Check for away status periodically
    const checkAwayStatus = setInterval(() => {
      const now = new Date().getTime()
      const lastActive = new Date(lastActivityRef.current).getTime()

      if (now - lastActive >= AWAY_TIMEOUT && channelRef.current) {
        channelRef.current.track({
          user_id: user?.id,
          email: user?.email,
          name: user?.name,
          last_seen: new Date().toISOString(),
          last_active: lastActivityRef.current,
          status: 'away'
        })
      }
    }, 5000) // Check every 5 seconds

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
      clearInterval(checkAwayStatus)
    }
  }, [updateActivity, user])

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

    channelRef.current = channel

    // Handle presence state changes
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const currentOnlineUsers = Object.values(state).flat().map((presence: any) => ({
        id: presence.user_id,
        email: presence.email,
        name: presence.name,
        last_seen: presence.last_seen,
        last_active: presence.last_active || presence.last_seen,
        status: presence.status || 'online'
      }))
      setOnlineUsers(currentOnlineUsers)
    })

    // Subscribe to the channel and start tracking presence
    channel
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await updateActivity()
        }
      })

    return () => {
      channel.unsubscribe()
      channelRef.current = null
    }
  }, [user, supabase, setOnlineUsers, updateActivity])

  return { onlineUsers }
}
