'use client'

import { useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Circle, ChevronDown } from 'lucide-react'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { useDMs } from '@/hooks/use-dms'
import { useOnlineUsers } from '@/hooks/use-online-users'
import { useIdleDetection } from '@/hooks/use-idle-detection'
import { DirectMessageUser } from './direct-message-user'
import { getStatusColor } from '@/lib/utils/status'
import type { DMUser } from '@/hooks/use-chat-data'

interface DirectMessagesListProps {
    userData: {
        id: string
        name: string | null
        email: string
    }
    currentChannel: {
        id: string
        name: string
        channel_type: string
    }
    directMessages: Array<{
        id: string
        name: string
        channel_type: 'channel' | 'direct_message'
        created_at: string | null
        created_by: string | null
        is_private: boolean | null
        updated_at: string | null
    }>
    dmUsers: Record<string, DMUser>
}

interface DMUserWithStatus extends DMUser {
    status: string
}

export function DirectMessagesList({
    userData,
    currentChannel,
    directMessages: initialDirectMessages,
    dmUsers,
}: DirectMessagesListProps) {
    const userId = userData.id
    const { directMessages } = useDMs(currentChannel.id, initialDirectMessages)
    const { onlineUsers } = useOnlineUsers({ userId })
    const { isIdle } = useIdleDetection()
    const router = useRouter()

    // Extract unique user IDs from DM channel names
    const dmUserIds = useMemo(() => {
        const userIds = new Set<string>()
        directMessages.forEach(channel => {
            if (channel.channel_type === 'direct_message') {
                const [, participants] = channel.name.split(':')
                const [user1, user2] = participants.split('_')
                if (user1 !== userId) userIds.add(user1)
                if (user2 !== userId) userIds.add(user2)
            }
        })
        return Array.from(userIds)
    }, [directMessages, userId])

    // Get DM users with their online status
    const dmUsersWithStatus = useMemo(() => {
        return dmUserIds
            .map(dmUserId => {
                const onlineUser = onlineUsers.find(
                    user => user.id === dmUserId,
                )
                const dmUser = dmUsers[dmUserId]

                if (!dmUser) return null

                return {
                    ...dmUser,
                    status: onlineUser?.status || 'offline',
                } as DMUserWithStatus
            })
            .filter((user): user is DMUserWithStatus => user !== null)
    }, [dmUserIds, onlineUsers, dmUsers])

    const handleUserClick = useCallback(
        async (otherUserId: string) => {
            // Find existing DM channel
            const dmName = `dm:${userId}_${otherUserId}`
            const altDmName = `dm:${otherUserId}_${userId}`
            const existingChannel = directMessages.find(
                channel =>
                    channel.name === dmName || channel.name === altDmName,
            )

            if (existingChannel) {
                router.push(`/chat/${existingChannel.id}`)
            }
        },
        [userId, router, directMessages],
    )

    const isUserActive = (selectedUserId: string) => {
        if (
            !currentChannel ||
            currentChannel.channel_type !== 'direct_message' ||
            selectedUserId === userId
        ) {
            return false
        }
        const [, participants] = currentChannel.name.split(':')
        const [user1, user2] = participants.split('_')
        return selectedUserId === user1 || selectedUserId === user2
    }

    const currentUserButtonClassName = useMemo(
        () =>
            cn(
                'flex items-center gap-1 justify-start w-full hover:bg-zinc-200 py-1 h-auto',
                isUserActive(userData.id) && 'bg-zinc-200',
            ),
        [isUserActive, userData.id],
    )

    const currentUserStatusClassName = useMemo(
        () =>
            `scale-[0.5] ${getStatusColor(isIdle ? 'away' : 'online')} fill-current`,
        [isIdle],
    )

    const currentUserDisplayName = useMemo(
        () => userData.name || userData.email,
        [userData.name, userData.email],
    )

    // Sort users by recent messages, online status, and name
    const sortedDmUsers = useMemo(() => {
        return [...dmUsersWithStatus].sort((a, b) => {
            // First sort by most recent message
            if (a.lastMessageAt && b.lastMessageAt) {
                if (a.lastMessageAt > b.lastMessageAt) return -1
                if (a.lastMessageAt < b.lastMessageAt) return 1
            } else if (a.lastMessageAt) {
                return -1
            } else if (b.lastMessageAt) {
                return 1
            }

            // Then sort by online status
            if (a.status === 'online' && b.status !== 'online') return -1
            if (a.status !== 'online' && b.status === 'online') return 1

            // Finally sort by name
            const aName = a.name || a.email || ''
            const bName = b.name || b.email || ''
            return aName.localeCompare(bName)
        })
    }, [dmUsersWithStatus])

    return (
        <Collapsible defaultOpen className="px-2">
            <div className="flex items-center px-2 py-2">
                <CollapsibleTrigger className="flex gap-2 items-center hover:text-zinc-600">
                    <ChevronDown className="w-4 h-4" />
                    <h2 className="text-sm font-semibold text-zinc-500">
                        Direct Messages
                    </h2>
                </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
                <div className="px-2">
                    <Button
                        key={userData.id}
                        variant="ghost"
                        className={currentUserButtonClassName}
                    >
                        <Circle className={currentUserStatusClassName} />
                        {currentUserDisplayName}{' '}
                        <span className="text-zinc-400 ml-1 text-[13px] inline-flex items-center font-extralight">
                            you
                        </span>
                    </Button>

                    {sortedDmUsers.map(user => (
                        <DirectMessageUser
                            key={user.id}
                            user={user}
                            isActive={isUserActive(user.id)}
                            onClick={() => handleUserClick(user.id)}
                        />
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}
