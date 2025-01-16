'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChannelMember } from '@/hooks/use-chat-data'
import { useDMParticipant } from '@/hooks/use-dm-participant'
import { useMemo } from 'react'

interface DirectMessageTitleProps {
    currentChannelId: string
    userId: string
    currentChannelMembers?: ChannelMember[]
}

export function DirectMessageTitle({
    currentChannelId,
    userId,
    currentChannelMembers,
}: DirectMessageTitleProps) {
    console.log(currentChannelMembers, 'currentChannelMembers')
    const participant = useDMParticipant({
        channelId: currentChannelId,
        currentUserId: userId,
        currentChannelMembers,
    })

    const displayName = participant?.name || 'Unknown User'
    const initials =
        participant?.name?.substring(0, 2).toUpperCase() || 'Unknown User'

    const avatarUrl = participant?.avatar_url || undefined

    if (!participant) return null

    return (
        <>
            <Avatar className="w-5 h-5 mr-2">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <h2 className="font-medium text-zinc-900">{displayName}</h2>
        </>
    )
}
