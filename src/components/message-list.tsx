'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import type { Database } from '@/lib/supabase/types'
import { useEffect, useRef, useState } from 'react'
import { UserData, useStore } from '@/lib/store'
import { createThread } from '@/lib/actions/create-thread'
import { MessageItem } from './message-item'
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom'

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
    userData: UserData
}

export function MessageList({ messages, userData }: MessageListProps) {
    const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
    const selectedMessageId = useStore(state => state.selectedMessageId)
    const selectMessage = useStore(state => state.selectMessage)

    const [isHighlighted, setIsHighlighted] = useState(false)
    const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(
        new Set(),
    )
    const [newThreadIds, setNewThreadIds] = useState<Set<string>>(new Set())

    const { scrollAreaRef } = useScrollToBottom({
        messages,
        shouldScrollToBottom,
        setShouldScrollToBottom,
    })

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
                    block: 'center',
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

    const handleCreateThread = async (messageId: string, channelId: string) => {
        try {
            const thread = await createThread(messageId, channelId)
            if (thread) {
                // Optimistically create a thread object and update the message
                const currentMessages = messages.map(m => {
                    if (m.id === messageId) {
                        return {
                            ...m,
                            thread: {
                                id: thread.id,
                                reply_count: 0,
                                last_reply_at: new Date().toISOString(),
                                replies: [],
                            },
                        }
                    }
                    return m
                })

                // Update the messages in the store
                useStore.getState().setMessages(channelId, currentMessages)

                // Set the thread as expanded and newly created
                setExpandedThreadIds(prev => new Set(prev).add(thread.id))
                setNewThreadIds(prev => new Set(prev).add(thread.id))
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
            setNewThreadIds(prev => {
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
        <ScrollArea ref={scrollAreaRef} className="flex-1 mr-1">
            <div className="p-4 pb-0 space-y-2">
                {messages.map(message => (
                    <MessageItem
                        key={message.id}
                        message={message}
                        isHighlighted={
                            selectedMessageId === message.id && isHighlighted
                        }
                        openMenuId={openMenuId}
                        expandedThreadId={
                            message.thread
                                ? expandedThreadIds.has(message.thread.id)
                                    ? message.thread.id
                                    : null
                                : null
                        }
                        newlyCreatedThreadIds={newThreadIds}
                        currentUser={userData!}
                        onOpenMenuChange={(open, messageId) =>
                            setOpenMenuId(open ? messageId : null)
                        }
                        onCreateThread={handleCreateThread}
                        onThreadToggle={handleThreadToggle}
                        messageRef={el => {
                            if (el) messageRefs.current[message.id] = el
                        }}
                    />
                ))}
            </div>
        </ScrollArea>
    )
}
