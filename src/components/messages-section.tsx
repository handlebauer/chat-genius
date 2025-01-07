'use client'

import { MessageList } from './message-list'
import { MessagesErrorBoundary } from './messages-error-boundary'
import { ErrorBoundary } from 'react-error-boundary'
import { Skeleton } from '@/components/ui/skeleton'

// TODO: Set this to true to enable skeleton loading UI for messages
const ENABLE_SKELETON_LOADING = false

interface MessagesSectionProps {
  messages: any[]
  loading?: boolean
}

export function MessagesSection({ messages, loading }: MessagesSectionProps) {
  if (loading && ENABLE_SKELETON_LOADING) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start space-x-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[120px]" />
              <Skeleton className="h-4 w-full max-w-[600px]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ErrorBoundary FallbackComponent={MessagesErrorBoundary}>
      <MessageList messages={messages} />
    </ErrorBoundary>
  )
}
