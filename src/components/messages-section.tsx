'use client'

import { MessageList } from './message-list'
import { MessagesErrorBoundary } from './messages-error-boundary'
import { ErrorBoundary } from 'react-error-boundary'
import { useEffect, useMemo, useRef } from 'react'
import { useRealTimeMessages } from '@/hooks/use-real-time-messages'
import { UserData } from '@/lib/store'
import { EmptyMessages } from './message-list/empty-messages'
import { useAvatarInitialMessage } from '@/hooks/use-avatar-initial-message'
import { useAvatarResponse } from '@/hooks/use-avatar-response'
import { isInternalAvatar } from '@/lib/utils'

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

    // Handle avatar interactions
    useAvatarInitialMessage({
        currentChannel,
        dmParticipant,
        messages,
        loading,
        userId: userData.id,
    })

    useAvatarResponse({
        currentChannel,
        dmParticipant,
        messages,
        loading,
        userId: userData.id,
    })

    // Auto-scroll to bottom when loading completes
    useEffect(() => {
        if (!loading) {
            if (loadingEndRef.current) {
                loadingEndRef.current.scrollIntoView()
            }
        }
    }, [loading])

    // Check if this is an avatar DM
    const isAvatarDM = useMemo(
        () =>
            currentChannel?.channel_type === 'direct_message' &&
            isInternalAvatar(dmParticipant?.email),
        [currentChannel?.channel_type, dmParticipant?.email],
    )

    // Show loading state during initial hydration or when fetching messages
    if (loading || !messages) {
        return <div className="flex-1"></div>
    }

    // Empty state (only shown after store is hydrated and messages are loaded)
    if (messages.length === 0) {
        if (isAvatarDM) {
            return <div className="flex-1"></div>
        }
        return (
            <div className="flex-1">
                <EmptyMessages />
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
