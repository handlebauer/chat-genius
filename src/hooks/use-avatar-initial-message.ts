import { useEffect, useRef } from 'react'
import { handleAvatarInitialMessage } from '@/lib/actions/avatar-commands'
import { useStore } from '@/lib/store'

interface UseAvatarInitialMessageProps {
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

export function useAvatarInitialMessage({
    currentChannel,
    dmParticipant,
    messages,
    loading,
    userId,
}: UseAvatarInitialMessageProps) {
    const hasTriggeredInitialMessage = useRef<boolean>(false)
    const setAiResponseLoading = useStore(state => state.setAiResponseLoading)

    useEffect(() => {
        const isAvatarDM =
            currentChannel?.channel_type === 'direct_message' &&
            dmParticipant?.email?.includes('@chatgenius.internal')
        const isEmptyChannel = messages?.length === 0

        if (
            isAvatarDM &&
            isEmptyChannel &&
            !loading && // Make sure we're not still loading
            !hasTriggeredInitialMessage.current
        ) {
            hasTriggeredInitialMessage.current = true

            if (dmParticipant?.id) {
                handleAvatarInitialMessage(
                    currentChannel.id,
                    dmParticipant.id,
                    userId,
                ).catch(console.error)
            } else {
                setAiResponseLoading(currentChannel.id, false)
            }
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
