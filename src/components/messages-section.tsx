'use client'

import { MessageList } from './message-list'
import { MessagesErrorBoundary } from './messages-error-boundary'
import { ErrorBoundary } from 'react-error-boundary'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect, useRef } from 'react'
import { useRealTimeMessages } from '@/hooks/use-real-time-messages'
import { UserData, useStore } from '@/lib/store'
import { EmptyMessages } from './empty-messages'

interface MessagesSectionProps {
    currentChannelId: string
    userData: UserData
}

export function MessagesSection({
    currentChannelId,
    userData,
}: MessagesSectionProps) {
    const { messages, loading } = useRealTimeMessages(currentChannelId)
    const loadingEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!loading) {
            loadingEndRef.current?.scrollIntoView()
        }
    }, [loading])

    // Show loading state during initial hydration or when fetching messages
    if (loading || !messages) {
        return <div className="flex-1"></div>
    }

    // Empty state (only shown after store is hydrated and messages are loaded)
    if (messages.length === 0) {
        return (
            <div className="flex-1">
                <EmptyMessages />
            </div>
        )
    }

    // Messages present state
    return (
        <ErrorBoundary FallbackComponent={MessagesErrorBoundary}>
            <MessageList messages={messages} userData={userData} />
        </ErrorBoundary>
    )
}
