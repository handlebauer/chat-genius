'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Database } from '@/lib/supabase/types'
import { MessageAttachments } from './message-attachments'
import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  content: string
  sender: Database['public']['Tables']['users']['Row']
  created_at: string
  channel_id: string
  attachments?: Database['public']['Tables']['attachments']['Row'][]
}

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const { selectedMessageId, selectMessage } = useStore()
  const [isHighlighted, setIsHighlighted] = useState(false)
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true)

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

  return (
    <ScrollArea className="flex-1" onScroll={handleScroll}>
      <div className="p-4 pb-0 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            ref={(el) => {
              if (el) messageRefs.current[message.id] = el
            }}
            className={cn(
              "relative group transition-colors duration-1000",
              selectedMessageId === message.id && isHighlighted && "bg-yellow-100 rounded-lg"
            )}
          >
            <div className="flex gap-2 items-start p-2">
              <Avatar className="w-7 h-7 mt-[2px]">
                <AvatarImage
                  src={message.sender.avatar_url || undefined}
                  alt={message.sender.name || message.sender.email}
                />
                <AvatarFallback className="text-xs">
                  {message.sender.name
                    ? message.sender.name.substring(0, 2).toUpperCase()
                    : message.sender.email.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium">{message.sender.name || message.sender.email.split('@')[0]}</span>
                  <span className="text-[11px] text-zinc-500 font-normal">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                </div>
                <div className="text-[13px] leading-relaxed text-zinc-800" dangerouslySetInnerHTML={{ __html: message.content }} />
                {message.attachments && <MessageAttachments attachments={message.attachments} />}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  )
}
