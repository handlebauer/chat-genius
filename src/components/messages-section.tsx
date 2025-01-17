'use client'

import { MessageList } from './message-list'
import { MessagesErrorBoundary } from './messages-error-boundary'
import { ErrorBoundary } from 'react-error-boundary'
import { useEffect, useRef } from 'react'
import { useRealTimeMessages } from '@/hooks/use-real-time-messages'
import { UserData, useStore } from '@/lib/store'
import { EmptyMessages } from './empty-messages'
import { handleAvatarInitialMessage } from '@/lib/actions/avatar-commands'

interface MessagesSectionProps {
    currentChannelId: string
    userData: UserData
    currentChannel: {
        id: string
        channel_type: string
        name: string
    }
    dmParticipant?: {
        id: string
        email: string
    }
}

export function MessagesSection({
    currentChannelId,
    userData,
    currentChannel,
    dmParticipant,
}: MessagesSectionProps) {
    const { messages, loading } = useRealTimeMessages(currentChannelId)
    const loadingEndRef = useRef<HTMLDivElement>(null)
    const hasTriggeredInitialMessage = useRef<boolean>(false)
    const setAiResponseLoading = useStore(state => state.setAiResponseLoading)

    useEffect(() => {
        if (!loading) {
            loadingEndRef.current?.scrollIntoView()
        }
    }, [loading])

    // Check for empty avatar DM channel
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
                    userData.id,
                ).catch(console.error)
            } else {
                setAiResponseLoading(currentChannel.id, false)
            }
        }
    }, [currentChannel, dmParticipant, messages, loading, setAiResponseLoading])

    // Show loading state during initial hydration or when fetching messages
    if (loading || !messages) {
        return <div className="flex-1"></div>
    }

    // Check if this is an avatar DM
    const isAvatarDM =
        currentChannel?.channel_type === 'direct_message' &&
        dmParticipant?.email?.includes('@chatgenius.internal')

    // Empty state (only shown after store is hydrated and messages are loaded)
    if (messages.length === 0) {
        return (
            <div className="flex-1">
                <EmptyMessages isAvatarDM={isAvatarDM} />
            </div>
        )
    }

    // Messages present state
    return (
        <ErrorBoundary FallbackComponent={MessagesErrorBoundary}>
            <MessageList
                messages={messages}
                userData={userData}
                currentChannel={currentChannel}
                dmParticipant={dmParticipant}
            />
        </ErrorBoundary>
    )
}
