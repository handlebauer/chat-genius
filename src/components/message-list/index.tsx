'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/lib/store'
import { createThread } from '@/lib/actions/create-thread'
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom'
import { EmptyMessages } from './empty-messages'
import { LoadingState } from './loading-state'
import { MessageListContent } from './message-list-content'
import { TypingIndicatorWrapper } from './typing-indicator-wrapper'
import type { MessageListProps } from './types'

export function MessageList({
    messages,
    userData,
    isLoading = false,
    currentChannel,
    dmParticipant,
}: MessageListProps) {
    // Refs
    const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})
    const initialRenderRef = useRef(true)

    // Store values
    const selectedMessageId = useStore(state => state.selectedMessageId)
    const aiResponseLoading = useStore(state => state.aiResponseLoading)
    const activeChannelId = useStore(state => state.activeChannelId)

    // State
    const [isHighlighted] = useState(false)
    const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true)
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)
    const [expandedThreadIds, setExpandedThreadIds] = useState<Set<string>>(
        new Set(),
    )
    const [newThreadIds, setNewThreadIds] = useState<Set<string>>(new Set())
    const [initialLoading, setInitialLoading] = useState(true)

    // Hooks
    const { scrollAreaRef, scrollToBottom } = useScrollToBottom({
        messages,
        shouldScrollToBottom,
        setShouldScrollToBottom,
    })

    // Effects
    useEffect(() => {
        if (initialRenderRef.current) {
            const timer = setTimeout(() => {
                setInitialLoading(false)
                initialRenderRef.current = false
                if (shouldScrollToBottom) {
                    requestAnimationFrame(() => {
                        scrollToBottom()
                    })
                }
            }, 500)
            return () => clearTimeout(timer)
        }
    }, [shouldScrollToBottom, scrollToBottom])

    // Handlers
    const handleCreateThread = async (messageId: string, channelId: string) => {
        try {
            const thread = await createThread(messageId, channelId)
            if (thread) {
                setExpandedThreadIds(prev => {
                    const next = new Set(prev)
                    next.add(thread.id)
                    return next
                })
                setNewThreadIds(prev => {
                    const next = new Set(prev)
                    next.add(thread.id)
                    return next
                })
            }
        } catch (error) {
            console.error('Error creating thread:', error)
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
                <LoadingState />
            ) : messages.length === 0 ? (
                <EmptyMessages />
            ) : (
                <div className="flex flex-col p-4 pb-3">
                    <div className="space-y-2 flex-1">
                        <MessageListContent
                            messages={messages}
                            selectedMessageId={selectedMessageId}
                            isHighlighted={isHighlighted}
                            openMenuId={openMenuId}
                            expandedThreadIds={expandedThreadIds}
                            newThreadIds={newThreadIds}
                            userData={userData}
                            onOpenMenuChange={(open, messageId) =>
                                setOpenMenuId(open ? messageId : null)
                            }
                            onCreateThread={handleCreateThread}
                            onThreadToggle={handleThreadToggle}
                            messageRefs={messageRefs}
                        />
                        <TypingIndicatorWrapper
                            isVisible={Boolean(
                                activeChannelId &&
                                    aiResponseLoading[activeChannelId],
                            )}
                            dmParticipant={dmParticipant}
                            currentChannel={currentChannel}
                        />
                    </div>
                </div>
            )}
        </ScrollArea>
    )
}
