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
    const prevChannelIdRef = useRef<string>(null)

    const scrollToBottom = () => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector(
                '[data-radix-scroll-area-viewport]',
            )
            if (scrollContainer) {
                const images = Array.from(scrollContainer.getElementsByTagName('img'))
                Promise.all(
                    images.map(img =>
                        img.complete
                            ? Promise.resolve()
                            : new Promise(resolve => img.onload = resolve)
                    )
                ).then(() => {
                    scrollContainer.scrollTop = scrollContainer.scrollHeight
                })
            }
        }
    }

    // Handle automatic scrolling when message length changes or component mounts
    useEffect(() => {
        const messageLength = messages.length
        const currentChannelId = messages[0]?.channel_id

        if (
            shouldScrollToBottom &&
            (messageLength > prevMessageLengthRef.current || // New message added
                prevMessageLengthRef.current === 0)  || // Initial load
            currentChannelId !== prevChannelIdRef.current // Channel switched
        ) {
            scrollToBottom()
        }

        prevMessageLengthRef.current = messageLength
        prevChannelIdRef.current = currentChannelId
    }, [messages.length, shouldScrollToBottom])

    // Reset shouldScrollToBottom when switching channels
    useEffect(() => {
        const currentChannelId = messages[0]?.channel_id
        if (currentChannelId && currentChannelId !== prevChannelIdRef.current) {
            setShouldScrollToBottom(true)
            scrollToBottom()
            prevChannelIdRef.current = currentChannelId
        }
    }, [messages[0]?.channel_id, setShouldScrollToBottom])

    return {
        scrollAreaRef,
        scrollToBottom,
    }
}
