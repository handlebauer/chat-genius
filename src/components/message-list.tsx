'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import type { Database } from '@/lib/supabase/types'
import { useEffect, useRef, useState } from 'react'
import { UserData, useStore } from '@/lib/store'
import { createThread } from '@/lib/actions/create-thread'
import { MessageItem } from './message-item'
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { EmptyMessages } from './empty-messages'
import { Skeleton } from '@/components/ui/skeleton'

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
    isLoading?: boolean
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

function MessageSkeleton() {
    return (
        <div className="flex gap-2 items-start p-1 pb-[2px] relative">
            <Skeleton className="w-7 h-7 rounded-full" />
            <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
        </div>
    )
}

export function MessageList({
    messages,
    userData,
    isLoading = false,
    currentChannel,
    dmParticipant,
}: MessageListProps) {
    const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
    const selectedMessageId = useStore(state => state.selectedMessageId)
    const selectMessage = useStore(state => state.selectMessage)
    const aiResponseLoading = useStore(state => state.aiResponseLoading)
    const activeChannelId = useStore(state => state.activeChannelId)

    const [isHighlighted, setIsHighlighted] = useState(false)
    const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(
        new Set(),
    )
    const [newThreadIds, setNewThreadIds] = useState<Set<string>>(new Set())
    const [initialLoading, setInitialLoading] = useState(true)
    const initialRenderRef = useRef(true)

    const { scrollAreaRef, scrollToBottom } = useScrollToBottom({
        messages,
        shouldScrollToBottom,
        setShouldScrollToBottom,
    })

    // Handle initial loading state
    useEffect(() => {
        if (initialRenderRef.current) {
            const timer = setTimeout(() => {
                setInitialLoading(false)
                initialRenderRef.current = false
                // Ensure scroll position is correct after loading
                if (shouldScrollToBottom) {
                    requestAnimationFrame(() => {
                        scrollToBottom()
                    })
                }
            }, 500)
            return () => clearTimeout(timer)
        }
    }, [shouldScrollToBottom, scrollToBottom])

    // Ensure scroll position is correct after loading
    useEffect(() => {
        if (!isLoading && shouldScrollToBottom) {
            requestAnimationFrame(() => {
                scrollToBottom()
            })
        }
    }, [isLoading, shouldScrollToBottom, scrollToBottom])

    // Add scroll listener to detect when user is near bottom
    useEffect(() => {
        const scrollArea = scrollAreaRef.current
        if (!scrollArea) return

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = scrollArea
            const isNearBottom = scrollHeight - (scrollTop + clientHeight) < 100
            if (isNearBottom && !shouldScrollToBottom) {
                setShouldScrollToBottom(true)
            }
        }

        scrollArea.addEventListener('scroll', handleScroll)
        return () => scrollArea.removeEventListener('scroll', handleScroll)
    }, [scrollAreaRef, shouldScrollToBottom, setShouldScrollToBottom])

    // Reset shouldScrollToBottom when selection is cleared
    useEffect(() => {
        if (!selectedMessageId) {
            const scrollArea = scrollAreaRef.current
            if (scrollArea) {
                const { scrollTop, scrollHeight, clientHeight } = scrollArea
                const isNearBottom =
                    scrollHeight - (scrollTop + clientHeight) < 100
                if (isNearBottom) {
                    setShouldScrollToBottom(true)
                }
            }
        }
    }, [selectedMessageId, scrollAreaRef])

    // Scroll to bottom when loading indicator appears
    useEffect(() => {
        if (activeChannelId && aiResponseLoading[activeChannelId]) {
            console.log('🔄 AI Response Loading State:', {
                channelId: activeChannelId,
                loading: aiResponseLoading[activeChannelId],
                shouldScrollToBottom,
            })
            if (shouldScrollToBottom) {
                scrollToBottom()
            }
        }
    }, [
        activeChannelId,
        aiResponseLoading,
        shouldScrollToBottom,
        scrollToBottom,
    ])

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
            {isLoading || initialLoading ? (
                <div className="flex flex-col p-4 pb-3">
                    <div className="space-y-4">
                        {Array.from({ length: 7 }).map((_, i) => (
                            <MessageSkeleton key={i} />
                        ))}
                    </div>
                </div>
            ) : messages.length === 0 ? (
                <EmptyMessages />
            ) : (
                <div className="flex flex-col p-4 pb-3">
                    <div className="space-y-2 flex-1">
                        {messages.map(message => (
                            <MessageItem
                                key={message.id}
                                message={message}
                                isHighlighted={
                                    selectedMessageId === message.id &&
                                    isHighlighted
                                }
                                openMenuId={openMenuId}
                                expandedThreadId={
                                    message.thread
                                        ? expandedThreadIds.has(
                                              message.thread.id,
                                          )
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
                        {activeChannelId &&
                            aiResponseLoading[activeChannelId] && (
                                <div
                                    className={cn(
                                        'relative transition-colors duration-200 rounded-lg group hover:bg-zinc-100',
                                    )}
                                >
                                    <div className="flex gap-2 items-start p-1 pb-[2px] relative">
                                        <Avatar className="w-7 h-7 mt-[2px]">
                                            <AvatarImage
                                                src="https://api.dicebear.com/7.x/bottts/svg?seed=ai-test"
                                                alt="AI Test Bot"
                                            />
                                            <AvatarFallback className="text-xs">
                                                AI
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-0.5 flex-1">
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-sm font-medium">
                                                    AI Test Bot
                                                </span>
                                                <span className="text-[11px] text-zinc-500 font-normal">
                                                    {new Date().toLocaleTimeString(
                                                        [],
                                                        {
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                        },
                                                    )}
                                                </span>
                                            </div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" />
                                                <span>typing...</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                    </div>
                </div>
            )}
        </ScrollArea>
    )
}
