'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserData, useStore } from '@/lib/store'
import { useEffect, useMemo, useState } from 'react'

interface DirectMessageTitleProps {
    currentChannelId: string
    userId: string
}

export function DirectMessageTitle({
    currentChannelId,
    userId,
}: DirectMessageTitleProps) {
    const [participant, setParticipant] = useState<UserData | null>(null)
    const getDMParticipant = useStore(state => state.getDMParticipant)

    useEffect(() => {
        setParticipant(getDMParticipant(currentChannelId, userId))
    }, [currentChannelId, userId])

    const avatarUrl = participant?.avatar_url || undefined
    const displayName = participant?.name || 'Unknown User'

    return (
        <>
            <Avatar className="w-5 h-5 mr-2">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="text-xs">
                    {displayName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <h2 className="font-medium text-zinc-900">{displayName}</h2>
        </>
    )
}
