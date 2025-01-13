'use client'

import { Button } from '@/components/ui/button'
import { Circle } from 'lucide-react'
import {
    Collapsible,
    CollapsibleTrigger,
    CollapsibleContent,
} from '@/components/ui/collapsible'
import { ChevronDown } from 'lucide-react'
import { useOnlineUsers } from '@/hooks/use-online-users'
import { useIdleDetection } from '@/hooks/use-idle-detection'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, memo } from 'react'
import { cn } from '@/lib/utils'
import { Channel, UserData } from '@/lib/store'
import { useDMs } from '@/hooks/use-dms'

const getStatusColor = (status?: string) => {
    switch (status) {
        case 'away':
            return 'text-yellow-500'
        case 'online':
            return 'text-green-500'
        default:
            return 'text-gray-500'
    }
}

interface DirectMessagesListProps {
    userData: UserData
    currentChannel: Channel
    directMessages: Channel[]
}

interface DirectMessageUserProps {
    user: {
        id: string
        name?: string
        email?: string
        status?: string
    }
    isActive: boolean
    onClick: () => void
}

const DirectMessageUser = memo(function DirectMessageUser({
    user,
    isActive,
    onClick,
}: DirectMessageUserProps) {
    const buttonClassName = useMemo(
        () =>
            cn(
                'flex items-center gap-1 justify-start w-full hover:bg-zinc-200 py-1 h-auto',
                isActive && 'bg-zinc-200',
            ),
        [isActive],
    )

    const statusClassName = useMemo(
        () => `scale-[0.5] ${getStatusColor(user.status)} fill-current`,
        [user.status],
    )

    const displayName = useMemo(
        () => user.name || user.email,
        [user.name, user.email],
    )

    if (!displayName) return null

    return (
        <Button variant="ghost" className={buttonClassName} onClick={onClick}>
            <Circle className={statusClassName} />
            {displayName}
        </Button>
    )
})

export function DirectMessagesList({
    userData,
    currentChannel,
    directMessages: initialDirectMessages,
}: DirectMessagesListProps) {
    const userId = userData.id
    const { directMessages } = useDMs(currentChannel.id, initialDirectMessages)
    const { onlineUsers } = useOnlineUsers({ userId })
    const { isIdle } = useIdleDetection()
    const router = useRouter()

    console.log('directMessages', directMessages)

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
    const dmUsers = useMemo(() => {
        return dmUserIds.map(dmUserId => {
            const onlineUser = onlineUsers.find(user => user.id === dmUserId)
            return {
                id: dmUserId,
                name: onlineUser?.name,
                email: onlineUser?.email,
                status: onlineUser?.status || 'offline',
            }
        })
    }, [dmUserIds, onlineUsers])

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

                    {dmUsers.map(user => (
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
