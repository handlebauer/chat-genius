'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import type { Database } from '@/lib/supabase/types'
import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { createThread } from '@/lib/actions'
import { MessageItem } from './message-item'

interface ThreadReply {
  id: string
  content: string
  sender: Database['public']['Tables']['users']['Row']
  created_at: string
}

interface Thread {
  id: string
  reply_count: number
  last_reply_at: string
  replies: ThreadReply[]
}

interface Message {
  id: string
  content: string
  sender: Database['public']['Tables']['users']['Row']
  created_at: string
  channel_id: string
  attachments?: Database['public']['Tables']['attachments']['Row'][]
  thread?: Thread
}

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const { selectedMessageId, selectMessage, userData } = useStore()
  const [isHighlighted, setIsHighlighted] = useState(false)
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(new Set())
  const [newlyCreatedThreadIds, setNewlyCreatedThreadIds] = useState<Set<string>>(new Set())

  const scrollToBottom = () => {
    if (shouldScrollToBottom) {
      messagesEndRef.current?.scrollIntoView()
    }
  }

  // Handle new messages
  useEffect(() => {
    // Only scroll to bottom for new messages if we're not in a search-result view
    if (!selectedMessageId && shouldScrollToBottom) {
      scrollToBottom()
    }
  }, [messages])

  // Handle scrolling to selected message
  useEffect(() => {
    if (selectedMessageId) {
      // Disable auto-scroll to bottom when we're viewing a search result
      setShouldScrollToBottom(false)

      if (messageRefs.current[selectedMessageId]) {
        // Set highlight state
        setIsHighlighted(true)

        // Scroll to the message
        messageRefs.current[selectedMessageId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        })

        // Start fading out after a delay
        const fadeStartTimer = setTimeout(() => {
          setIsHighlighted(false)
        }, 1500)

        // Clear the selection after the fade completes
        const selectionTimer = setTimeout(() => {
          selectMessage(null)
          // Don't re-enable auto-scroll here, keep the scroll position
        }, 2500) // 1.5s delay + 1s fade duration

        return () => {
          clearTimeout(fadeStartTimer)
          clearTimeout(selectionTimer)
        }
      }
    }
  }, [selectedMessageId, selectMessage])

  // Re-enable auto-scroll only when user manually scrolls to bottom
  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement
    const isAtBottom = target.scrollHeight - target.scrollTop === target.clientHeight
    if (isAtBottom) {
      setShouldScrollToBottom(true)
    }
  }

  const handleCreateThread = async (messageId: string, channelId: string) => {
    try {
      const thread = await createThread(messageId, channelId)
      if (thread) {
        // Wait a short moment for the database to update
        await new Promise(resolve => setTimeout(resolve, 100))

        // Find the message and check if it has the thread now
        const message = messages.find(m => m.id === messageId)
        if (message?.thread) {
          setExpandedThreadIds(prev => new Set(prev).add(thread.id))
          setNewlyCreatedThreadIds(prev => new Set(prev).add(thread.id))
        } else {
          // If the message doesn't have the thread yet, we need to wait for the next message update
          const cleanup = useStore.subscribe((state, prevState) => {
            const prevMessage = prevState.messages[channelId]?.find(m => m.id === messageId)
            const newMessage = state.messages[channelId]?.find(m => m.id === messageId)
            const hasNewThread = newMessage && 'thread' in newMessage && newMessage.thread && 'id' in newMessage.thread

            if (hasNewThread && (!prevMessage?.thread || prevMessage.thread.id !== (newMessage as Message & { thread: Thread }).thread.id)) {
              setExpandedThreadIds(prev => new Set(prev).add((newMessage as Message & { thread: Thread }).thread.id))
              setNewlyCreatedThreadIds(prev => new Set(prev).add((newMessage as Message & { thread: Thread }).thread.id))
              cleanup()
            }
          })

          // Clean up the subscription after 5 seconds if it hasn't fired
          setTimeout(cleanup, 5000)
        }
      }
    } catch (error) {
      console.error('Failed to create thread:', error)
      // TODO: Add error toast notification
    } finally {
      setOpenMenuId(null)
    }
  }

  const handleThreadToggle = (threadId: string, isNewlyCreated: boolean) => {
    if (isNewlyCreated) {
      setExpandedThreadIds(prev => {
        const next = new Set(prev)
        next.delete(threadId)
        return next
      })
      setNewlyCreatedThreadIds(prev => {
        const next = new Set(prev)
        next.delete(threadId)
        return next
      })
    } else {
      setExpandedThreadIds(prev => {
        const next = new Set(prev)
        if (next.has(threadId)) {
          next.delete(threadId)
        } else {
          next.add(threadId)
        }
        return next
      })
    }
  }

  return (
    <ScrollArea className="flex-1" onScroll={handleScroll}>
      <div className="p-4 pb-0 space-y-4">
        {messages.map(message => (
          <MessageItem
            key={message.id}
            message={message}
            isHighlighted={selectedMessageId === message.id && isHighlighted}
            openMenuId={openMenuId}
            expandedThreadId={message.thread ? (expandedThreadIds.has(message.thread.id) ? message.thread.id : null) : null}
            newlyCreatedThreadIds={newlyCreatedThreadIds}
            currentUser={userData!}
            onOpenMenuChange={(open, messageId) => setOpenMenuId(open ? messageId : null)}
            onCreateThread={handleCreateThread}
            onThreadToggle={handleThreadToggle}
            messageRef={(el) => {
              if (el) messageRefs.current[message.id] = el
            }}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )
}
