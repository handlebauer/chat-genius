'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SmilePlus, Reply, MessageSquare, Bot } from 'lucide-react'
import { MessageAttachments } from './message-attachments'
import { MessageReactions } from './message-reactions'
import { ThreadView } from './thread-view'
import { toggleReaction } from '@/lib/actions/toggle-reaction'
import { useStore } from '@/lib/store'
import type { Database } from '@/lib/supabase/types'
import EmojiPicker, { Theme, Categories, EmojiStyle } from 'emoji-picker-react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { useState, useRef, useMemo, useCallback } from 'react'
import { formatMentionText } from '@/lib/utils/mentions'
import { useRouter } from 'next/navigation'
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { createDM } from '@/lib/actions/create-dm'
import type { UserData } from '@/lib/store'
import { createAvatar } from '@/lib/actions/create-avatar'

type User = Database['public']['Tables']['users']['Row']

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
    reactions?: Reaction[]
}

interface Reaction {
    emoji: string
    count: number
    hasReacted: boolean
}

interface MessageItemProps {
    message: Message
    isHighlighted: boolean
    openMenuId: string | null
    expandedThreadId: string | null
    newlyCreatedThreadIds: Set<string>
    currentUser: Database['public']['Tables']['users']['Row']
    onOpenMenuChange: (open: boolean, messageId: string) => void
    onCreateThread: (messageId: string, channelId: string) => void
    onThreadToggle: (threadId: string, isNewlyCreated: boolean) => void
    messageRef?: (el: HTMLDivElement | null) => void
}

const customPickerStyles = {
    '--epr-category-navigation-button-size': '24px',
    '--epr-emoji-size': '24px',
    '--epr-header-padding': '0.5rem',
    '--epr-category-label-height': '24px',
    '--epr-emoji-padding': '0.375rem',
} as React.CSSProperties

const customCategoryOrder = [
    {
        category: Categories.SMILEYS_PEOPLE,
        name: 'Smileys & People',
    },
    {
        category: Categories.ANIMALS_NATURE,
        name: 'Animals & Nature',
    },
    {
        category: Categories.FOOD_DRINK,
        name: 'Food & Drink',
    },
    {
        category: Categories.ACTIVITIES,
        name: 'Activities',
    },
    {
        category: Categories.TRAVEL_PLACES,
        name: 'Travel & Places',
    },
    {
        category: Categories.OBJECTS,
        name: 'Objects',
    },
    {
        category: Categories.SYMBOLS,
        name: 'Symbols',
    },
    {
        category: Categories.FLAGS,
        name: 'Flags',
    },
]

export function MessageItem({
    message,
    isHighlighted,
    openMenuId,
    expandedThreadId,
    newlyCreatedThreadIds,
    currentUser,
    onCreateThread,
    onThreadToggle,
    messageRef: messageRefCallback,
}: MessageItemProps) {
    const router = useRouter()
    const thread = message.thread
    const [isEmojiOpen, setIsEmojiOpen] = useState(false)
    const [isReactionTooltipOpen, setIsReactionTooltipOpen] = useState(false)
    const [isThreadTooltipOpen, setIsThreadTooltipOpen] = useState(false)
    const messageRef = useRef<HTMLDivElement | null>(null)
    const messagePositionRef = useRef<number | null>(null)

    const toggleReactionFn = useStore(state => state.toggleReaction)
    const mentionedUsers = useStore(state => state.mentionedUsers)
    const selectMessage = useStore(state => state.selectMessage)
    const dmParticipants = useStore(state => state.dmParticipants)
    const setChannels = useStore(state => state.setChannels)
    const channels = useStore(state => state.channels)
    const setUserMenuTarget = useStore(state => state.setUserMenuTarget)

    // Handle message mention clicks
    const handleMessageClick = useCallback(
        (event: React.MouseEvent) => {
            const target = event.target as HTMLElement
            if (target.closest('.message-mention')) {
                event.preventDefault()
                event.stopPropagation()

                const mentionSpan = target.closest(
                    '.message-mention',
                ) as HTMLElement
                const messageId = mentionSpan.getAttribute('data-message-id')
                const channelId = mentionSpan.getAttribute('data-channel-id')

                if (messageId && channelId) {
                    console.log('🔗 Message mention clicked:', {
                        messageId,
                        channelId,
                        currentChannelId: message.channel_id,
                    })

                    // If different channel, navigate first
                    if (channelId !== message.channel_id) {
                        console.log('↪️ Navigating to channel:', channelId)
                        router.push(`/chat/${channelId}`)
                    }

                    // Select the message to trigger scroll
                    console.log('🎯 Selecting message:', messageId)
                    selectMessage(messageId)
                }
            }
        },
        [router, message.channel_id, selectMessage],
    )

    // Format content with mentioned users from store
    const formattedContent = useMemo(
        () => formatMentionText(message.content, mentionedUsers),
        [message.content, mentionedUsers],
    )

    // Store the message's position before any thread interaction
    const captureMessagePosition = () => {
        if (messageRef.current) {
            const rect = messageRef.current.getBoundingClientRect()
            messagePositionRef.current = rect.top
        }
    }

    // Adjust scroll position to maintain message position
    const adjustScrollPosition = () => {
        if (messageRef.current && messagePositionRef.current !== null) {
            const newRect = messageRef.current.getBoundingClientRect()
            const delta = newRect.top - messagePositionRef.current
            if (delta !== 0) {
                window.scrollBy({ top: delta })
            }
            messagePositionRef.current = null
        }
    }

    // Handle thread interactions
    const handleThreadInteraction = () => {
        captureMessagePosition()
        if (thread && thread.reply_count > 0) {
            onThreadToggle(thread.id, newlyCreatedThreadIds.has(thread.id))
        } else {
            onCreateThread(message.id, message.channel_id)
        }
        // Use requestAnimationFrame to ensure the DOM has updated
        requestAnimationFrame(adjustScrollPosition)
    }

    // Handle both refs
    const handleRef = (el: HTMLDivElement | null) => {
        messageRef.current = el
        if (messageRefCallback) {
            messageRefCallback(el)
        }
    }

    const handleReactionClick = async (emoji: string) => {
        try {
            setIsEmojiOpen(false)
            // Use the store's toggleReaction for optimistic update

            toggleReactionFn(
                message.id,
                message.channel_id,
                emoji,
                currentUser.id,
            )

            // Make the API call
            const result = await toggleReaction(message.id, emoji)
            if (!result.success) {
                console.error('Failed to toggle reaction:', result.error)
                // Revert optimistic update on failure by toggling again
                useStore
                    .getState()
                    .toggleReaction(
                        message.id,
                        message.channel_id,
                        emoji,
                        currentUser.id,
                    )
                // TODO: Add error toast notification
            }
        } catch (error) {
            console.error('Error toggling reaction:', error)
            // TODO: Add error toast notification
        }
    }

    const handleSenderClick = useCallback(async () => {
        // Don't create a DM with yourself
        if (message.sender.id === currentUser.id) return

        try {
            // Transform sender into UserData type
            const userData: UserData = {
                id: message.sender.id,
                name: message.sender.name,
                email: message.sender.email,
                avatar_url: message.sender.avatar_url,
                created_at: message.sender.created_at,
                updated_at: message.sender.updated_at,
                status: null,
            }

            // Check for existing DM channel
            const existingChannel = channels?.find(
                channel =>
                    channel.channel_type === 'direct_message' &&
                    dmParticipants[channel.id]?.id === message.sender.id,
            )

            if (existingChannel) {
                // Store participant info and navigate
                useStore
                    .getState()
                    .setDMParticipant(existingChannel.id, userData)
                router.push(`/chat/${existingChannel.id}`)
            } else {
                // Create new DM channel
                const channel = await createDM(
                    currentUser.id,
                    message.sender.id,
                )
                if (!channel) {
                    throw new Error('Failed to create DM channel')
                }

                // Update channels in store
                setChannels([
                    ...channels.filter(c => c.channel_type === 'channel'),
                    ...channels.filter(
                        c =>
                            c.channel_type === 'direct_message' &&
                            c.id !== channel.id,
                    ),
                    channel,
                ])

                // Store participant info and navigate
                useStore.getState().setDMParticipant(channel.id, userData)
                router.push(`/chat/${channel.id}`)
            }
        } catch (error) {
            console.error('Failed to create or navigate to DM:', error)
        }
    }, [
        message.sender,
        currentUser.id,
        router,
        channels,
        dmParticipants,
        setChannels,
    ])

    const handleAvatarChat = async () => {
        try {
            // Create avatar user
            const avatar = await createAvatar(message.sender.id)

            // Create DM channel with avatar
            const channel = await createDM(currentUser.id, avatar.id)
            if (!channel) {
                throw new Error('Failed to create DM channel')
            }

            // Update channels in store
            setChannels([
                ...channels.filter(c => c.channel_type === 'channel'),
                ...channels.filter(
                    c =>
                        c.channel_type === 'direct_message' &&
                        c.id !== channel.id,
                ),
                channel,
            ])

            // Store participant info and navigate
            const avatarUserData: UserData = {
                id: avatar.id,
                name: avatar.name,
                email: avatar.email,
                avatar_url: avatar.avatar_url,
                created_at: avatar.created_at,
                updated_at: avatar.updated_at,
                status: null,
            }
            useStore.getState().setDMParticipant(channel.id, avatarUserData)
            router.push(`/chat/${channel.id}`)
        } catch (error) {
            console.error('Failed to create or navigate to avatar chat:', error)
        }
    }

    return (
        <div
            ref={handleRef}
            className={cn(
                'relative transition-colors duration-200',
                isHighlighted && 'bg-yellow-100 rounded-lg',
                openMenuId === message.id ||
                    isEmojiOpen ||
                    isReactionTooltipOpen ||
                    isThreadTooltipOpen ||
                    (thread &&
                        expandedThreadId === thread.id &&
                        !newlyCreatedThreadIds.has(thread.id))
                    ? 'bg-zinc-100'
                    : 'hover:bg-zinc-100',
                'rounded-lg group',
            )}
        >
            <div className="flex gap-2 items-start p-1 pb-[2px] relative">
                <ContextMenu>
                    <ContextMenuTrigger asChild>
                        <div className="cursor-pointer select-none">
                            <Avatar className="w-7 h-7 mt-[2px]">
                                <AvatarImage
                                    src={message.sender.avatar_url || undefined}
                                    alt={
                                        message.sender.name ||
                                        message.sender.email
                                    }
                                />
                                <AvatarFallback className="text-xs">
                                    {message.sender.name
                                        ? message.sender.name
                                              .substring(0, 2)
                                              .toUpperCase()
                                        : message.sender.email
                                              .substring(0, 2)
                                              .toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                        <ContextMenuItem
                            className="cursor-pointer select-none"
                            onClick={handleSenderClick}
                        >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Send DM
                        </ContextMenuItem>
                        <ContextMenuItem
                            className="cursor-pointer select-none"
                            onClick={handleAvatarChat}
                        >
                            <Bot className="mr-2 h-4 w-4" />
                            Chat with Avatar
                        </ContextMenuItem>
                    </ContextMenuContent>
                </ContextMenu>
                <div className="space-y-0.5 flex-1">
                    <div className="flex items-baseline gap-2">
                        <ContextMenu>
                            <ContextMenuTrigger asChild>
                                <span className="text-sm font-medium cursor-pointer select-none">
                                    {message.sender.name ||
                                        message.sender.email.split('@')[0]}
                                </span>
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuItem
                                    className="cursor-pointer select-none"
                                    onClick={handleSenderClick}
                                >
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Send DM
                                </ContextMenuItem>
                                <ContextMenuItem
                                    className="cursor-pointer select-none"
                                    onClick={handleAvatarChat}
                                >
                                    <Bot className="mr-2 h-4 w-4" />
                                    Chat with Avatar
                                </ContextMenuItem>
                            </ContextMenuContent>
                        </ContextMenu>
                        <span className="text-[11px] text-zinc-500 font-normal">
                            {new Date(message.created_at).toLocaleTimeString(
                                [],
                                {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                },
                            )}
                        </span>
                    </div>
                    <div
                        className="text-[13px] leading-relaxed text-zinc-800"
                        dangerouslySetInnerHTML={{ __html: formattedContent }}
                        onClick={handleMessageClick}
                    />
                    <div className="pl-0 pb-1">
                        {message.attachments && (
                            <MessageAttachments
                                attachments={message.attachments}
                            />
                        )}
                        <MessageReactions
                            reactions={message.reactions}
                            onReactionClick={handleReactionClick}
                        />
                    </div>
                </div>
                <div
                    className={cn(
                        'absolute right-1 top-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity',
                        (openMenuId === message.id ||
                            isEmojiOpen ||
                            isReactionTooltipOpen ||
                            isThreadTooltipOpen) &&
                            'opacity-100',
                    )}
                >
                    <TooltipProvider delayDuration={150}>
                        <div className="flex gap-0.5">
                            <div className="relative">
                                <Tooltip>
                                    <Popover
                                        open={isEmojiOpen}
                                        onOpenChange={setIsEmojiOpen}
                                    >
                                        <div className="flex">
                                            <TooltipTrigger asChild>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={cn(
                                                            'h-7 w-7 hover:bg-zinc-200 focus-visible:ring-0 cursor-pointer bg-zinc-50/80 shadow-sm',
                                                            (openMenuId ===
                                                                message.id ||
                                                                isEmojiOpen ||
                                                                isReactionTooltipOpen) &&
                                                                'bg-zinc-200',
                                                        )}
                                                    >
                                                        <SmilePlus className="h-4 w-4" />
                                                    </Button>
                                                </PopoverTrigger>
                                            </TooltipTrigger>
                                        </div>
                                        <PopoverContent
                                            className="w-[352px] p-0"
                                            align="end"
                                            sideOffset={5}
                                        >
                                            <div className="relative">
                                                <EmojiPicker
                                                    theme={Theme.LIGHT}
                                                    onEmojiClick={emojiData => {
                                                        handleReactionClick(
                                                            emojiData.emoji,
                                                        )
                                                    }}
                                                    lazyLoadEmojis
                                                    searchDisabled
                                                    skinTonesDisabled
                                                    emojiStyle={
                                                        EmojiStyle.NATIVE
                                                    }
                                                    height={280}
                                                    width="100%"
                                                    previewConfig={{
                                                        showPreview: false,
                                                    }}
                                                    categories={
                                                        customCategoryOrder
                                                    }
                                                    style={customPickerStyles}
                                                />
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                    <TooltipContent
                                        side="bottom"
                                        sideOffset={4}
                                        onPointerEnter={() =>
                                            setIsReactionTooltipOpen(true)
                                        }
                                        onPointerLeave={() =>
                                            setIsReactionTooltipOpen(false)
                                        }
                                    >
                                        Add reaction
                                    </TooltipContent>
                                </Tooltip>
                            </div>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            'h-7 w-7 hover:bg-zinc-200 focus-visible:ring-0 cursor-pointer bg-zinc-50/80 shadow-sm',
                                            (openMenuId === message.id ||
                                                isThreadTooltipOpen) &&
                                                'bg-zinc-200',
                                        )}
                                        onClick={handleThreadInteraction}
                                    >
                                        <Reply className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="bottom"
                                    sideOffset={4}
                                    onPointerEnter={() =>
                                        setIsThreadTooltipOpen(true)
                                    }
                                    onPointerLeave={() =>
                                        setIsThreadTooltipOpen(false)
                                    }
                                >
                                    {thread && thread.reply_count > 0
                                        ? expandedThreadId === thread.id
                                            ? 'Collapse thread'
                                            : 'Expand thread'
                                        : 'Start thread'}
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </TooltipProvider>
                </div>
            </div>
            {thread && currentUser && (
                <div className="pb-1">
                    <ThreadView
                        thread={thread}
                        isExpanded={expandedThreadId === thread.id}
                        onToggle={() => {
                            onThreadToggle(
                                thread.id,
                                newlyCreatedThreadIds.has(thread.id),
                            )
                        }}
                        currentUser={currentUser}
                        isNewlyCreated={newlyCreatedThreadIds.has(thread.id)}
                    />
                </div>
            )}
        </div>
    )
}
