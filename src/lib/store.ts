import { create } from 'zustand'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

// Types
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

interface Reaction {
    emoji: string
    count: number
    hasReacted: boolean
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

export interface OnlineUser {
    id: string
    name: string
    email: string | undefined
    last_seen: string
    status: 'online' | 'away'
}

type Channel = Database['public']['Tables']['channels']['Row']

type UserData = Database['public']['Tables']['users']['Row']

// Store interfaces
interface MessagesState {
    messages: Record<string, Message[]> // Keyed by channel_id
    messagesLoading: Record<string, boolean> // Loading state for each channel
    selectedMessageId: string | null // Track selected message for scrolling
    addMessage: (channelId: string | undefined, message: Message) => void
    setMessages: (channelId: string | undefined, messages: Message[]) => void
    setMessagesLoading: (
        channelId: string | undefined,
        loading: boolean,
    ) => void
    selectMessage: (messageId: string | null) => void
    getMessageById: (
        messageId: string,
    ) => { message: Message; channelId: string } | null
    updateMessageReactions: (
        messageId: string,
        channelId: string,
        reactions: Reaction[],
    ) => void
    toggleReaction: (
        messageId: string,
        channelId: string,
        emoji: string,
        userId: string,
    ) => void
}

interface OnlineUsersState {
    onlineUsers: OnlineUser[]
    setOnlineUsers: (users: OnlineUser[]) => void
}

interface UserState {
    userData: UserData | null
    setUserData: (data: UserData | null) => void
}

interface ChannelsState {
    channels: Channel[]
    channelsLoading: boolean
    setChannels: (channels: Channel[]) => void
    setChannelsLoading: (loading: boolean) => void
    activeChannelId: string | null
    setActiveChannelId: (id: string | null) => void
    getCurrentChannel: () => Channel | undefined
    getDMParticipant: (
        channelId: string | null,
        currentUserId: string,
    ) => UserData | null
    addChannel: (channel: Channel) => void
    removeChannel: (channelId: string) => void
    canDeleteChannel: (channelId: string, userId: string) => boolean
}

// Combined store type
interface Store
    extends MessagesState,
        OnlineUsersState,
        UserState,
        ChannelsState {}

// Create store
export const useStore = create<Store>((set, get) => ({
    // Messages slice
    messages: {},
    messagesLoading: {},
    selectedMessageId: null,
    addMessage: (channelId, message) => {
        if (typeof channelId !== 'string') return
        set(state => ({
            messages: {
                ...state.messages,
                [channelId]: [...(state.messages[channelId] || []), message],
            },
        }))
    },
    setMessages: (channelId, messages) => {
        if (typeof channelId !== 'string') return
        set(state => ({
            messages: {
                ...state.messages,
                [channelId]: messages,
            },
        }))
    },
    setMessagesLoading: (channelId, loading) => {
        if (typeof channelId !== 'string') return
        set(state => ({
            messagesLoading: {
                ...state.messagesLoading,
                [channelId]: loading,
            },
        }))
    },
    selectMessage: messageId => set({ selectedMessageId: messageId }),
    getMessageById: messageId => {
        const state = get()
        for (const [channelId, messages] of Object.entries(state.messages)) {
            const message = messages.find(m => m.id === messageId)
            if (message) {
                return { message, channelId }
            }
        }
        return null
    },
    updateMessageReactions: (messageId, channelId, reactions) => {
        set(state => ({
            messages: {
                ...state.messages,
                [channelId]:
                    state.messages[channelId]?.map(message =>
                        message.id === messageId
                            ? { ...message, reactions }
                            : message,
                    ) || [],
            },
        }))
    },
    toggleReaction: (messageId, channelId, emoji, userId) => {
        set(state => {
            const messages = state.messages[channelId] || []
            const message = messages.find(m => m.id === messageId)
            if (!message) return state

            const currentReactions = message.reactions || []
            const existingReaction = currentReactions.find(
                r => r.emoji === emoji,
            )

            let updatedReactions: Reaction[]
            if (existingReaction) {
                // Remove or update the reaction
                if (
                    existingReaction.count === 1 &&
                    existingReaction.hasReacted
                ) {
                    updatedReactions = currentReactions.filter(
                        r => r.emoji !== emoji,
                    )
                } else {
                    updatedReactions = currentReactions.map(r =>
                        r.emoji === emoji
                            ? {
                                  ...r,
                                  count: r.hasReacted
                                      ? r.count - 1
                                      : r.count + 1,
                                  hasReacted: !r.hasReacted,
                              }
                            : r,
                    )
                }
            } else {
                // Add new reaction
                updatedReactions = [
                    ...currentReactions,
                    { emoji, count: 1, hasReacted: true },
                ]
            }

            return {
                messages: {
                    ...state.messages,
                    [channelId]: messages.map(m =>
                        m.id === messageId
                            ? { ...m, reactions: updatedReactions }
                            : m,
                    ),
                },
            }
        })
    },

    // Online users slice
    onlineUsers: [],
    setOnlineUsers: users => set({ onlineUsers: users }),

    // User data slice
    userData: null,
    setUserData: data => set({ userData: data }),

    // Channels slice
    channels: [],
    channelsLoading: true,
    setChannels: channels => set({ channels, channelsLoading: false }),
    setChannelsLoading: loading => set({ channelsLoading: loading }),
    activeChannelId: null,
    setActiveChannelId: id => set({ activeChannelId: id }),
    getCurrentChannel: () => {
        const { channels, activeChannelId } = get()
        return channels.find(channel => channel.id === activeChannelId)
    },
    getDMParticipant: (channelId, currentUserId) => {
        const state = get()
        const channel = state.channels.find(c => c.id === channelId)

        if (!channel || channel.channel_type !== 'direct_message') return null

        // Extract user IDs from the channel name (format: dm:userId1_userId2)
        const [, userIds] = channel.name.split(':')
        const otherUserId = userIds.split('_').find(id => id !== currentUserId)
        if (!otherUserId) return null

        // Try to find the other user from multiple sources
        // 1. Check message history for user data (most complete data)
        const channelMessages = state.messages[channel.id] || []
        const userFromMessages = channelMessages.find(
            msg => msg.sender.id === otherUserId,
        )?.sender
        if (userFromMessages) return userFromMessages

        // 2. Check online users
        const onlineUser = state.onlineUsers.find(u => u.id === otherUserId)
        if (onlineUser) {
            return {
                id: onlineUser.id,
                name: onlineUser.name,
                email: onlineUser.email || '',
                avatar_url: null,
                status: 'online',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }
        }

        return null
    },
    addChannel: channel =>
        set(state => ({
            channels: [...state.channels, channel],
        })),
    removeChannel: channelId =>
        set(state => ({
            channels: state.channels.filter(c => c.id !== channelId),
            activeChannelId:
                state.activeChannelId === channelId
                    ? null
                    : state.activeChannelId,
        })),
    canDeleteChannel: (channelId, userId) => {
        const channel = get().channels.find(c => c.id === channelId)
        return channel?.created_by === userId
    },
}))
