'use client'

import { MessageList } from './message-list'
import { MessagesErrorBoundary } from './messages-error-boundary'
import { ErrorBoundary } from 'react-error-boundary'

interface MessagesSectionProps {
  messages: any[]
}

export function MessagesSection({ messages }: MessagesSectionProps) {
  return (
    <ErrorBoundary FallbackComponent={MessagesErrorBoundary}>
      <MessageList messages={messages} />
    </ErrorBoundary>
  )
}
