import { useEffect } from 'react'
import { handleAvatarResponse } from '@/lib/actions/avatar-commands'
import { useStore } from '@/lib/store'

interface UseAvatarResponseProps {
    currentChannel: {
        id: string
        channel_type: string
    }
    dmParticipant?: {
        id: string
        email: string
    }
    messages: any[] | null
    loading: boolean
    userId: string
}

export function useAvatarResponse({
    currentChannel,
    dmParticipant,
    messages,
    loading,
    userId,
}: UseAvatarResponseProps) {
    const setAiResponseLoading = useStore(state => state.setAiResponseLoading)

    useEffect(() => {
        const isAvatarDM =
            currentChannel?.channel_type === 'direct_message' &&
            dmParticipant?.email?.includes('@chatgenius.internal')

        if (!isAvatarDM || !messages?.length || loading) {
            return
        }

        // Get the most recent message
        const lastMessage = messages[messages.length - 1]

        // Only respond if the last message was from the current user
        if (lastMessage.sender?.id === userId) {
            setAiResponseLoading(currentChannel.id, true)
            handleAvatarResponse(
                currentChannel.id,
                dmParticipant!.id,
                userId,
                lastMessage.content,
            )
                .catch(console.error)
                .finally(() => {
                    setAiResponseLoading(currentChannel.id, false)
                })
        }
    }, [
        currentChannel,
        dmParticipant,
        messages,
        loading,
        userId,
        setAiResponseLoading,
    ])
}
