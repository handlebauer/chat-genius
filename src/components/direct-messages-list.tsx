'use client'

import { useMemo, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Circle, ChevronDown } from 'lucide-react'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { useOnlineUsers } from '@/hooks/use-online-users'
import { useIdleDetection } from '@/hooks/use-idle-detection'
import { DirectMessageUser } from './direct-message-user'
import { getStatusColor } from '@/lib/utils/status'
import type { DMUser } from '@/hooks/use-chat-data'
import type { Channel } from '@/lib/store'
import { botUserConfig } from '@/config'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/store'
import { useUnreadMessages } from '@/hooks/use-unread-messages'

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
    directMessages: Channel[]
    dmUsers: Record<string, DMUser>
}

interface DMUserWithStatus extends DMUser {
    status: string
}

export function DirectMessagesList({
    userData,
    currentChannel,
    directMessages,
    dmUsers,
}: DirectMessagesListProps) {
    const userId = userData.id
    const { onlineUsers } = useOnlineUsers({ userId })
    const { isIdle } = useIdleDetection()
    const router = useRouter()
    const params = useParams() as { channelId?: string }
    const clearUnreadCount = useStore(state => state.clearUnreadCount)

    // Initialize unread messages subscription with active channel context
    useUnreadMessages(userId, params.channelId)

    // Extract unique user IDs from DM channels - memoized with stable references
    const dmUserIds = useMemo(() => {
        const userIds = new Set<string>()
        directMessages.forEach(channel => {
            if (channel.channel_type === 'direct_message') {
                const otherUser = dmUsers[channel.id]
                if (otherUser && otherUser.id !== userId) {
                    userIds.add(otherUser.id)
                }
            }
        })
        return Array.from(userIds)
    }, [directMessages.length, userId, Object.keys(dmUsers).length])

    // Get DM users with their online status - with debug
    const dmUsersWithStatus = useMemo(() => {
        return dmUserIds
            .map(dmUserId => {
                const onlineUser = onlineUsers.find(
                    user => user.id === dmUserId,
                )
                // Find the DM channel that contains this user
                const dmChannel = directMessages.find(
                    channel =>
                        channel.channel_type === 'direct_message' &&
                        dmUsers[channel.id]?.id === dmUserId,
                )
                const dmUser = dmChannel ? dmUsers[dmChannel.id] : null

                if (!dmUser || !dmChannel) return null

                // Always set bot as online, before any other status checks
                if (dmUser.email === botUserConfig.email) {
                    return {
                        ...dmUser,
                        status: 'online',
                        channelId: dmChannel.id,
                    }
                }

                return {
                    ...dmUser,
                    status: onlineUser?.status || 'offline',
                    channelId: dmChannel.id,
                }
            })
            .filter(
                (user): user is DMUserWithStatus & { channelId: string } =>
                    user !== null,
            )
    }, [dmUserIds, onlineUsers, dmUsers, directMessages])

    const handleUserClick = useCallback(
        async (otherUserId: string) => {
            // Find existing DM channel by checking if both users are members
            const existingChannel = directMessages.find(
                channel => dmUsers[channel.id]?.id === otherUserId,
            )

            if (existingChannel) {
                // Clear unread count in local state immediately
                clearUnreadCount(existingChannel.id)

                // Navigate to the channel
                router.push(`/chat/${existingChannel.id}`)

                // Then clear unread count in the database
                const supabase = createClient()
                await supabase.rpc('reset_unread_count', {
                    p_channel_id: existingChannel.id,
                    p_user_id: userData.id,
                })
            }
        },
        [directMessages, dmUsers, router, clearUnreadCount, userData.id],
    )

    const isUserActive = useCallback(
        (selectedUserId: string) => {
            if (
                !currentChannel ||
                currentChannel.channel_type !== 'direct_message' ||
                selectedUserId === userId
            ) {
                return false
            }
            // Check if the selected user is a member of the current channel
            return dmUsers[currentChannel.id]?.id === selectedUserId
        },
        [currentChannel, userId, dmUsers],
    )

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
            // Always put bot user first, regardless of any other criteria
            if (a.email === botUserConfig.email) return -1
            if (b.email === botUserConfig.email) return 1

            // Rest of sorting logic for non-bot users
            // First sort by most recent message
            if (a.lastMessageAt && b.lastMessageAt) {
                if (a.lastMessageAt > b.lastMessageAt) return -1
                if (a.lastMessageAt < b.lastMessageAt) return 1
            } else if (a.lastMessageAt) {
                return -1
            } else if (b.lastMessageAt) {
                return 1
            }

            // Then sort by online status priority: online > away > offline
            const getStatusPriority = (status: string) => {
                switch (status) {
                    case 'online':
                        return 0
                    case 'away':
                        return 1
                    case 'offline':
                        return 2
                    default:
                        return 3
                }
            }

            const aPriority = getStatusPriority(a.status)
            const bPriority = getStatusPriority(b.status)
            if (aPriority !== bPriority) {
                return aPriority - bPriority
            }

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
                            channelId={user.channelId}
                        />
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}
