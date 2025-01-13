'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useMemo, useCallback } from 'react'
import { Users } from 'lucide-react'
import { useOnlineUsers } from '@/hooks/use-online-users'
import { useIdleDetection } from '@/hooks/use-idle-detection'
import { useRouter } from 'next/navigation'
import { createDM } from '@/lib/actions/create-dm'
import { useStore } from '@/lib/store'
import { useShallow } from 'zustand/react/shallow'

interface MembersSidebarProps {
    members: {
        id: string
        name: string | null
        email: string
        avatar_url: string | null
        role: 'owner' | 'admin' | 'member'
    }[]
    userId: string
}

const getStatusColor = (status?: string) => {
    switch (status) {
        case 'away':
            return 'bg-yellow-500'
        case 'online':
            return 'bg-emerald-500'
        default:
            return 'bg-zinc-400'
    }
}

export function MembersSidebar({ members, userId }: MembersSidebarProps) {
    const router = useRouter()

    const { onlineUsers } = useOnlineUsers({ userId })
    const { isIdle } = useIdleDetection()
    const channels = useStore(useShallow(state => state.channels))

    // Group and sort members by role without showing labels
    const sortedMembers = useMemo(() => {
        const roleOrder = ['owner', 'admin', 'member']
        return [...members].sort((a, b) => {
            const aIndex = roleOrder.indexOf(a.role)
            const bIndex = roleOrder.indexOf(b.role)
            return aIndex - bIndex
        })
    }, [members])

    // Get online status for each member
    const getMemberStatus = (memberId: string) => {
        const onlineUser = onlineUsers.find(user => user.id === memberId)
        if (!onlineUser) return 'offline'
        return onlineUser.status === 'away' || isIdle ? 'away' : 'online'
    }

    const handleUserClick = useCallback(
        async (otherUserId: string) => {
            // Don't create a DM with yourself
            if (otherUserId === userId) return

            try {
                // Check for existing DM channel
                const dmName = `dm:${userId}_${otherUserId}`
                const altDmName = `dm:${otherUserId}_${userId}`
                const existingChannel = channels?.find(
                    channel =>
                        channel.channel_type === 'direct_message' &&
                        (channel.name === dmName || channel.name === altDmName),
                )

                if (existingChannel) {
                    // If DM exists, just navigate to it
                    router.push(`/chat/${existingChannel.id}`)
                } else {
                    // Create new DM channel if none exists and navigate to it
                    const channel = await createDM(userId, otherUserId)
                    router.push(`/chat/${channel.id}`)
                }
            } catch (error) {
                console.error('Failed to create or navigate to DM:', error)
            }
        },
        [userId, router, channels],
    )

    return (
        <div className="w-60 bg-zinc-50 border-l flex flex-col">
            <div className="mt-14 px-4 py-3 flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-500 transition-colors">
                    <Users size={13} strokeWidth={2.5} />
                    <span className="text-[11px] font-medium tracking-wide">
                        {members.length}{' '}
                        {members.length === 1 ? 'member' : 'members'}
                    </span>
                </div>
            </div>
            <ScrollArea className="flex-1">
                {sortedMembers.map(member => (
                    <div
                        key={member.id}
                        className="px-3 py-1 flex items-center gap-2 hover:bg-zinc-100 cursor-pointer"
                        onClick={() => handleUserClick(member.id)}
                    >
                        <div className="relative">
                            {member.avatar_url ? (
                                <img
                                    src={member.avatar_url}
                                    alt={member.name || member.email}
                                    className="w-8 h-8 rounded-full"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-zinc-500 flex items-center justify-center text-white font-medium">
                                    {(member.name ||
                                        member.email)[0].toUpperCase()}
                                </div>
                            )}
                            <div
                                className={cn(
                                    'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white',
                                    getStatusColor(getMemberStatus(member.id)),
                                )}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-zinc-900 truncate">
                                {member.name || member.email.split('@')[0]}
                            </div>
                            {member.name && (
                                <div className="text-xs text-zinc-500 truncate">
                                    {member.email}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </ScrollArea>
        </div>
    )
}
