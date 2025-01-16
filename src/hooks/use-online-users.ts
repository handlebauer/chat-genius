'use client'

import { useEffect, useCallback, useState, useRef } from 'react'
import { useUserData } from '@/hooks/use-user-data'
import { useIdleDetection } from '@/hooks/use-idle-detection'
import { useStore } from '@/lib/store'
import { useShallow } from 'zustand/react/shallow'
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
    const onlineUsers = useStore(useShallow(state => state.onlineUsers))
    const setOnlineUsers = useStore(state => state.setOnlineUsers)
    const { userData } = useUserData(userId)
    const { isIdle } = useIdleDetection()
    const [isLoading, setIsLoading] = useState(true)
    const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null)

    // Memoize the presence sync handler with proper types
    const handlePresenceSync = useCallback(
        (state: RealtimePresenceState) => {
            // Clear any existing timeout
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current)
            }

            // Debounce the update
            debounceTimeoutRef.current = setTimeout(() => {
                const currentOnlineUsers = Object.values(state)
                    .flat()
                    .map(
                        (presence: PresenceState): OnlineUser => ({
                            id: presence.user_id,
                            email: presence.email || '',
                            name:
                                presence.name ||
                                presence.email ||
                                presence.user_id,
                            last_seen: new Date().toISOString(),
                            status: presence.status,
                        }),
                    )
                setOnlineUsers(currentOnlineUsers)
            }, 1000) // Debounce for 1 second
        },
        [setOnlineUsers],
    )

    useEffect(() => {
        if (!userData) return

        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: userData.id,
                },
            },
        })

        channel.on('presence', { event: 'sync' }, () => {
            handlePresenceSync(channel.presenceState())
        })

        channel.subscribe(async status => {
            if (status === 'SUBSCRIBED') {
                const presenceData: PresenceState = {
                    user_id: userData.id,
                    email: userData.email,
                    name: userData.name || null,
                    last_seen: new Date().toISOString(),
                    status: isIdle ? 'away' : 'online',
                }
                await channel.track(presenceData)
                setIsLoading(false)
            }
        })

        return () => {
            channel.unsubscribe()
        }
    }, [userData, supabase, handlePresenceSync, isIdle])

    useEffect(() => {
        return () => {
            // Clean up timeout on unmount
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current)
            }
        }
    }, [])

    return { onlineUsers, isLoading }
}
