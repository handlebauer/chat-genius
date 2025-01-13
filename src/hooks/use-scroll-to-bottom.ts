import { useEffect, useRef } from 'react'

interface UseScrollToBottomProps {
    messages: { channel_id: string }[]
    shouldScrollToBottom: boolean
    setShouldScrollToBottom: (value: boolean) => void
}

export function useScrollToBottom({
    messages,
    shouldScrollToBottom,
    setShouldScrollToBottom,
}: UseScrollToBottomProps) {
    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const prevMessageLengthRef = useRef(messages.length)

    const scrollToBottom = () => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector(
                '[data-radix-scroll-area-viewport]',
            )
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight
            }
        }
    }

    // Handle automatic scrolling when message length changes or component mounts
    useEffect(() => {
        const messageLength = messages.length
        if (
            shouldScrollToBottom &&
            (messageLength > prevMessageLengthRef.current || // New message added
                prevMessageLengthRef.current === 0) // Initial load
        ) {
            scrollToBottom()
        }
        prevMessageLengthRef.current = messageLength
    }, [messages.length, shouldScrollToBottom])

    // Reset shouldScrollToBottom when switching channels
    useEffect(() => {
        if (messages[0]?.channel_id) {
            setShouldScrollToBottom(true)
            scrollToBottom()
        }
    }, [messages[0]?.channel_id])

    return {
        scrollAreaRef,
        scrollToBottom,
    }
}
