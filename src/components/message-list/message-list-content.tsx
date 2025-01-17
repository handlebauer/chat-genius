import { MessageItem } from '../message-item'
import type { Message } from './types'
import type { UserData } from '@/lib/store'

interface MessageListContentProps {
    messages: Message[]
    selectedMessageId: string | null
    isHighlighted: boolean
    openMenuId: string | null
    expandedThreadIds: Set<string>
    newThreadIds: Set<string>
    userData: UserData
    onOpenMenuChange: (open: boolean, messageId: string) => void
    onCreateThread: (messageId: string, channelId: string) => void
    onThreadToggle: (threadId: string, isNewlyCreated: boolean) => void
    messageRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>
}

export function MessageListContent({
    messages,
    selectedMessageId,
    isHighlighted,
    openMenuId,
    expandedThreadIds,
    newThreadIds,
    userData,
    onOpenMenuChange,
    onCreateThread,
    onThreadToggle,
    messageRefs,
}: MessageListContentProps) {
    return (
        <>
            {messages.map(message => (
                <MessageItem
                    key={message.id}
                    message={message}
                    isHighlighted={
                        selectedMessageId === message.id && isHighlighted
                    }
                    openMenuId={openMenuId}
                    expandedThreadId={
                        message.thread &&
                        expandedThreadIds.has(message.thread.id)
                            ? message.thread.id
                            : null
                    }
                    newlyCreatedThreadIds={newThreadIds}
                    currentUser={userData}
                    onOpenMenuChange={onOpenMenuChange}
                    onCreateThread={onCreateThread}
                    onThreadToggle={onThreadToggle}
                    messageRef={el => {
                        if (el) messageRefs.current[message.id] = el
                    }}
                />
            ))}
        </>
    )
}
