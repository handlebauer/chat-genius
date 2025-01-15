import { useMemo, useCallback, useEffect, useRef, useState } from 'react'
import { useOnlineUsers } from './use-online-users'
import { useIdleDetection } from './use-idle-detection'
import { ChannelMember } from './use-chat-data'
import { useShallow } from 'zustand/react/shallow'

type PresenceStatus = 'online' | 'away' | 'offline'

interface MemberPresence {
    members: ChannelMember[]
    getStatusColor: (memberId: string) => string
    getMemberStatus: (memberId: string) => PresenceStatus
}

const STATUS_COLORS = {
    away: 'bg-yellow-500',
    online: 'bg-emerald-500',
    offline: 'bg-zinc-400',
} as const

const DEBOUNCE_MS = 1000 // Wait for 1 second of stability before updating

export function useMembersPresence(
    members: ChannelMember[],
    userId: string,
    systemUserId: string,
): MemberPresence {
    const { onlineUsers } = useOnlineUsers({ userId })
    const { isIdle } = useIdleDetection()
    const [debouncedState, setDebouncedState] = useState(() => ({
        onlineUsers,
        isIdle,
    }))

    // Use a ref for the timeout to avoid re-renders
    const debounceTimeout = useRef<ReturnType<typeof setTimeout>>(null)

    // Debounce updates to online status
    useEffect(() => {
        // Clear any existing timeout
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current)
        }

        // Set a new timeout
        debounceTimeout.current = setTimeout(() => {
            console.log('[useMembersPresence] Updating debounced state')
            setDebouncedState({ onlineUsers, isIdle })
        }, DEBOUNCE_MS)

        // Cleanup on unmount
        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current)
            }
        }
    }, [onlineUsers, isIdle])

    // Create a stable reference for the online status map using debounced values
    const onlineStatusMap = useMemo(() => {
        console.log('[useMembersPresence] Recomputing status map', {
            membersLength: members.length,
            onlineUsersLength: debouncedState.onlineUsers.length,
            isIdle: debouncedState.isIdle,
        })
        const map = new Map<string, PresenceStatus>()

        // Pre-compute all statuses
        members.forEach(member => {
            // System user and current user are always in a known state
            if (member.id === systemUserId) {
                map.set(member.id, 'online')
                return
            }
            if (member.id === userId) {
                map.set(member.id, debouncedState.isIdle ? 'away' : 'online')
                return
            }

            const onlineUser = debouncedState.onlineUsers.find(
                u => u.id === member.id,
            )
            if (!onlineUser) {
                map.set(member.id, 'offline')
                return
            }

            map.set(
                member.id,
                onlineUser.status === 'away' || debouncedState.isIdle
                    ? 'away'
                    : 'online',
            )
        })

        return map
    }, [members, debouncedState, systemUserId, userId])

    const getMemberStatus = useCallback(
        (memberId: string): PresenceStatus => {
            return onlineStatusMap.get(memberId) || 'offline'
        },
        [onlineStatusMap],
    )

    const getStatusColor = useCallback(
        (memberId: string): string => {
            return STATUS_COLORS[getMemberStatus(memberId)]
        },
        [getMemberStatus],
    )

    // Sort members with a stable primary sort (role) and presence as secondary
    const sortedMembers = useMemo(() => {
        const roleOrder = ['owner', 'admin', 'member']
        const statusOrder = ['online', 'away', 'offline']

        return [...members].sort((a, b) => {
            // Primary sort: Role (always stable)
            const aRoleIndex = roleOrder.indexOf(a.role)
            const bRoleIndex = roleOrder.indexOf(b.role)
            if (aRoleIndex !== bRoleIndex) {
                return aRoleIndex - bRoleIndex
            }

            // Secondary sort: Known states first (current user, system user)
            const aIsKnown = a.id === userId || a.id === systemUserId
            const bIsKnown = b.id === userId || b.id === systemUserId
            if (aIsKnown && !bIsKnown) return -1
            if (!aIsKnown && bIsKnown) return 1

            // Tertiary sort: Online status
            const aStatus = onlineStatusMap.get(a.id) || 'offline'
            const bStatus = onlineStatusMap.get(b.id) || 'offline'
            const aStatusIndex = statusOrder.indexOf(aStatus)
            const bStatusIndex = statusOrder.indexOf(bStatus)
            if (aStatusIndex !== bStatusIndex) {
                return aStatusIndex - bStatusIndex
            }

            // Final sort: Alphabetical by name for stability
            return (a.name || a.email).localeCompare(b.name || b.email)
        })
    }, [members, onlineStatusMap, userId, systemUserId])

    return {
        members: sortedMembers,
        getStatusColor,
        getMemberStatus,
    }
}
