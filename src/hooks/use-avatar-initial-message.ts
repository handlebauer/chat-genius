import { useEffect } from 'react'
import { Message } from '@/lib/store'
import { handleAvatarInitialMessage } from '@/lib/actions/avatar-commands'
import { isInternalAvatar } from '@/lib/utils'

interface UseAvatarInitialMessageProps {
    currentChannel: {
        id: string
        name: string
        channel_type: string
    }
    dmParticipant?: {
        id: string
        email: string
    }
    messages: Message[]
    loading: boolean
    userId: string
}

export function useAvatarInitialMessage({
    currentChannel,
    dmParticipant,
    messages,
    loading,
    userId,
}: UseAvatarInitialMessageProps) {
    useEffect(() => {
        // Only proceed if:
        // 1. Messages are loaded
        // 2. Channel is a DM with an avatar
        // 3. No messages exist yet
        if (
            !loading &&
            currentChannel.channel_type === 'direct_message' &&
            isInternalAvatar(dmParticipant?.email) &&
            messages.length === 0 &&
            dmParticipant?.id // Make sure we have the avatar's ID
        ) {
            handleAvatarInitialMessage(
                currentChannel.id,
                dmParticipant.id,
                userId,
            )
        }
    }, [
        loading,
        currentChannel.channel_type,
        currentChannel.id,
        dmParticipant?.email,
        dmParticipant?.id,
        messages.length,
        userId,
    ])
}
