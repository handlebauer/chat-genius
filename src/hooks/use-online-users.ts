'use client'

import { useEffect, useCallback } from 'react'
import { useUserData } from '@/hooks/use-user-data'
import { useIdleDetection } from '@/hooks/use-idle-detection'
import { useStore } from '@/lib/store'
import type { OnlineUser } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'

interface OnlineUsersProps {
    userId: string
}

// Type for the presence data tracked per user
interface PresenceState {
    user_id: string
    email: string | null
    name: string | null
    last_seen: string
    status: 'online' | 'away'
}

// Type for the presence state returned by Supabase
type RealtimePresenceState = Record<string, PresenceState[]>

export function useOnlineUsers({ userId }: OnlineUsersProps) {
    const supabase = createClient()
    const { onlineUsers, setOnlineUsers } = useStore()
    const user = useUserData(userId)
    const { isIdle } = useIdleDetection()

    // Memoize the presence sync handler with proper types
    const handlePresenceSync = useCallback(
        (state: RealtimePresenceState) => {
            const currentOnlineUsers = Object.values(state)
                .flat()
                .map(
                    (presence: PresenceState): OnlineUser => ({
                        id: presence.user_id,
                        email: presence.email || '',
                        name:
                            presence.name || presence.email || presence.user_id,
                        last_seen: new Date().toISOString(),
                        status: presence.status,
                    }),
                )
            setOnlineUsers(currentOnlineUsers)
        },
        [setOnlineUsers],
    )

    useEffect(() => {
        if (!user) return

        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: user.id,
                },
            },
        })

        channel.on('presence', { event: 'sync' }, () => {
            handlePresenceSync(channel.presenceState())
        })

        channel.subscribe(async status => {
            if (status === 'SUBSCRIBED') {
                const presenceData: PresenceState = {
                    user_id: user.id,
                    email: user.email,
                    name: user.name || null,
                    last_seen: new Date().toISOString(),
                    status: isIdle ? 'away' : 'online',
                }
                await channel.track(presenceData)
            }
        })

        return () => {
            channel.unsubscribe()
        }
    }, [user, supabase, handlePresenceSync, isIdle])

    return { onlineUsers }
}
