'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useChannelManagement } from '@/hooks/use-channel-management'

interface JoinChannelPromptProps {
    channelId: string
    channelName: string
    userId: string
}

export function JoinChannelPrompt({
    channelId,
    channelName,
    userId,
}: JoinChannelPromptProps) {
    const [isJoining, setIsJoining] = useState(false)
    const { joinChannel } = useChannelManagement(userId)

    const handleJoin = async () => {
        setIsJoining(true)
        try {
            await joinChannel(channelId)
        } catch (error) {
            setIsJoining(false)
            throw error
        }
    }

    return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
            <h3 className="text-lg font-medium text-zinc-900">
                Join #{channelName.toLowerCase()}
            </h3>
            <p className="text-sm text-zinc-500">
                You need to join this channel to see its messages and
                participate in discussions.
            </p>
            <Button onClick={handleJoin} disabled={isJoining}>
                {isJoining ? 'Joining...' : 'Join Channel'}
            </Button>
        </div>
    )
}
