import { create } from 'zustand'
import type { Database } from '@/lib/supabase/types'
import { ChannelMemberships } from '@/hooks/use-chat-data'
import { useShallow } from 'zustand/react/shallow'

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

export interface Message {
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

export type Channel = Database['public']['Tables']['channels']['Row']

export type UserData = Database['public']['Tables']['users']['Row']

// Store interfaces
interface MentionedUsersState {
    mentionedUsers: Record<string, UserData> // Keyed by user_id
    setMentionedUsers: (users: Record<string, UserData>) => void
    addMentionedUsers: (users: Record<string, UserData>) => void
    getMentionedUser: (userId: string) => UserData | undefined
}

interface MessagesState {
    messages: Record<string, Message[]> // Keyed by channel_id
    messagesLoading: Record<string, boolean> // Loading state for each channel
    selectedMessageId: string | null // Track selected message for scrolling
    aiResponseLoading: Record<string, boolean> // Track AI response loading state per channel
    pendingAiMessageTime: Record<string, string> // Track timestamp of pending AI message per channel
    initializedChannels: Set<string> // Track which channels have been initialized
    addMessage: (channelId: string | undefined, message: Message) => void
    setMessages: (channelId: string | undefined, messages: Message[]) => void
    setMessagesLoading: (
        channelId: string | undefined,
        loading: boolean,
    ) => void
    setAiResponseLoading: (
        channelId: string | undefined,
        loading: boolean,
        pendingMessageTime?: string,
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
    markChannelInitialized: (channelId: string) => void
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
    isHydrated: boolean
    channelMemberships: Record<string, boolean>
    pendingActiveChannelId: string | null // Track channel that's being switched to
    setChannels: (channels: Channel[], isHydrating?: boolean) => void
    setChannelsLoading: (loading: boolean) => void
    activeChannelId: string | null
    setActiveChannelId: (id: string | null) => void
    setPendingActiveChannelId: (id: string | null) => void // Set channel that's being switched to
    getDMParticipant: (
        channelId: string | null,
        currentUserId: string,
    ) => UserData | null
    addChannel: (channel: Channel) => void
    removeChannel: (channelId: string) => void
    canDeleteChannel: (channelId: string, userId: string) => boolean
    setChannelMemberships: (memberships: ChannelMemberships) => void
    isChannelMember: (channelId: string) => boolean
}

interface DMParticipantsState {
    dmParticipants: Record<string, UserData> // Keyed by channel_id
    setDMParticipant: (channelId: string, participant: UserData) => void
}

interface UnreadMessagesState {
    unreadCounts: Record<string, number> // Keyed by channel_id
    setUnreadCount: (channelId: string, count: number) => void
    clearUnreadCount: (channelId: string) => void
}

// Combined store type
interface Store
    extends MessagesState,
        OnlineUsersState,
        UserState,
        ChannelsState,
        MentionedUsersState,
        DMParticipantsState,
        UnreadMessagesState {}

// Create store
export const useStore = create<Store>((set, get) => ({
    // Messages slice
    messages: {},
    messagesLoading: {},
    selectedMessageId: null,
    aiResponseLoading: {},
    pendingAiMessageTime: {},
    initializedChannels: new Set<string>(),
    addMessage: (channelId, message) => {
        if (typeof channelId !== 'string') return

        // Check if this message matches our pending AI message
        const pendingTime = get().pendingAiMessageTime[channelId]
        if (pendingTime && message.sender.email === 'ai-bot@test.com') {
            // Clear loading state and pending time when we receive any AI message
            set(state => ({
                messages: {
                    ...state.messages,
                    [channelId]: [
                        ...(state.messages[channelId] || []),
                        message,
                    ],
                },
                aiResponseLoading: {
                    ...state.aiResponseLoading,
                    [channelId]: false,
                },
                pendingAiMessageTime: {
                    ...state.pendingAiMessageTime,
                    [channelId]: '',
                },
            }))
        } else {
            // Normal message addition
            set(state => ({
                messages: {
                    ...state.messages,
                    [channelId]: [
                        ...(state.messages[channelId] || []),
                        message,
                    ],
                },
            }))
        }
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
    markChannelInitialized: channelId => {
        set(state => {
            const newInitializedChannels = new Set(state.initializedChannels)
            newInitializedChannels.add(channelId)
            return { initializedChannels: newInitializedChannels }
        })
    },
    setAiResponseLoading: (channelId, loading, pendingMessageTime) => {
        if (typeof channelId !== 'string') return
        set(state => ({
            aiResponseLoading: {
                ...state.aiResponseLoading,
                [channelId]: loading,
            },
            ...(pendingMessageTime
                ? {
                      pendingAiMessageTime: {
                          ...state.pendingAiMessageTime,
                          [channelId]: pendingMessageTime,
                      },
                  }
                : {}),
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
    toggleReaction: (messageId, channelId, emoji) => {
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
    isHydrated: false,
    channelMemberships: {},
    activeChannelId: null,
    pendingActiveChannelId: null,
    setChannels: (channels, isHydrating = false) =>
        set({
            channels,
            channelsLoading: false,
            isHydrated: isHydrating ? true : get().isHydrated,
        }),
    setChannelsLoading: loading => set({ channelsLoading: loading }),
    setActiveChannelId: id =>
        set({ activeChannelId: id, pendingActiveChannelId: null }),
    setPendingActiveChannelId: id => set({ pendingActiveChannelId: id }),
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
    setChannelMemberships: channelMemberships => set({ channelMemberships }),
    isChannelMember: channelId => {
        return get().channelMemberships[channelId] || false
    },
    getDMParticipant: channelId => {
        const { channels, dmParticipants } = get()

        if (!channelId) return null

        const channel = channels.find(c => c.id === channelId)
        if (!channel || channel.channel_type !== 'direct_message') return null

        // Check our stored DM participants
        if (dmParticipants[channelId]) {
            return dmParticipants[channelId]
        }

        // Return null if we don't have the participant info
        return null
    },

    // Mentioned users slice
    mentionedUsers: {},
    setMentionedUsers: users => set({ mentionedUsers: users }),
    addMentionedUsers: users =>
        set(state => ({
            mentionedUsers: {
                ...state.mentionedUsers,
                ...users,
            },
        })),
    getMentionedUser: userId => get().mentionedUsers[userId],

    // DM participants slice
    dmParticipants: {},
    setDMParticipant: (channelId, participant) =>
        set(state => ({
            dmParticipants: {
                ...state.dmParticipants,
                [channelId]: participant,
            },
        })),

    // Unread messages slice
    unreadCounts: {},
    setUnreadCount: (channelId, count) =>
        set(state => ({
            unreadCounts: {
                ...state.unreadCounts,
                [channelId]: count,
            },
        })),
    clearUnreadCount: channelId =>
        set(state => ({
            unreadCounts: {
                ...state.unreadCounts,
                [channelId]: 0,
            },
        })),
}))

// Create a stable selector at the module level
const selectIsChannelMemberFn = (state: Store) => state.isChannelMember

// Export a hook that uses the stable selector with shallow comparison
export const useIsChannelMember = () =>
    useStore(useShallow(selectIsChannelMemberFn))
