'use client'

import { memo, useCallback } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ChannelMember } from '@/hooks/use-chat-data'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { Channel, UserData } from '@/lib/store'
import { createDM } from '@/lib/actions/create-dm'
import { useStore } from '@/lib/store'

interface MemberItemProps {
    member: ChannelMember
    isCurrentUser: boolean
    isSystemUser: boolean
    statusColor: string
    currentUserId: string
    channels: Channel[]
}

export const MemberItem = memo(function MemberItem({
    member,
    isCurrentUser,
    isSystemUser,
    statusColor,
    currentUserId,
    channels,
}: MemberItemProps) {
    const router = useRouter()

    const handleUserClick = useCallback(
        async (otherUserId: string) => {
            // Don't create a DM with yourself
            if (otherUserId === currentUserId) return

            try {
                // Transform member into UserData type
                const userData: UserData = {
                    id: member.id,
                    name: member.name,
                    email: member.email,
                    avatar_url: member.avatar_url,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    status: null,
                }

                // Check for existing DM channel
                const dmName = `dm:${currentUserId}_${otherUserId}`
                const altDmName = `dm:${otherUserId}_${currentUserId}`
                const existingChannel = channels?.find(
                    channel =>
                        channel.channel_type === 'direct_message' &&
                        (channel.name === dmName || channel.name === altDmName),
                )

                if (existingChannel) {
                    // Store participant info and navigate
                    useStore
                        .getState()
                        .setDMParticipant(existingChannel.id, userData)
                    router.push(`/chat/${existingChannel.id}`)
                } else {
                    // Create new DM channel, store participant info and navigate
                    const channel = await createDM(currentUserId, otherUserId)
                    useStore.getState().setDMParticipant(channel.id, userData)
                    router.push(`/chat/${channel.id}`)
                }
            } catch (error) {
                console.error('Failed to create or navigate to DM:', error)
            }
        },
        [currentUserId, router, channels, member],
    )

    return (
        <div
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-zinc-100/80 cursor-pointer"
            onClick={() => handleUserClick(member.id)}
        >
            <div className="relative">
                <Avatar className="h-7 w-7">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback>
                        {member.name?.[0]?.toUpperCase() ||
                            member.email[0].toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div
                    className={cn(
                        'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white',
                        statusColor,
                    )}
                />
            </div>
            <div className="flex flex-col">
                <span className="text-sm font-medium text-zinc-900">
                    {member.name || member.email.split('@')[0]}
                    {isCurrentUser && ' (you)'}
                    {isSystemUser && ' (AI)'}
                </span>
                <span className="text-xs text-zinc-500">{member.role}</span>
            </div>
        </div>
    )
})
