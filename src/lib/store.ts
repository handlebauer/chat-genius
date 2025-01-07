import { create } from 'zustand'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

// Types
interface Message {
  id: string
  content: string
  sender: Database['public']['Tables']['users']['Row']
  created_at: string
  channel_id: string
}

interface OnlineUser {
  id: string
  name: string
  email: string | undefined
  last_seen: string
}

interface Channel {
  id: string
  name: string
  description: string | null
  created_at: string
}

interface UserData {
  id: string
  name: string
  email: string
  avatar_url: string | null
  status: string
}

// Store interfaces
interface MessagesState {
  messages: Record<string, Message[]> // Keyed by channel_id
  messagesLoading: Record<string, boolean> // Loading state for each channel
  addMessage: (channelId: string | undefined, message: Message) => void
  setMessages: (channelId: string | undefined, messages: Message[]) => void
  setMessagesLoading: (channelId: string | undefined, loading: boolean) => void
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
  setChannels: (channels: Channel[]) => void
  activeChannelId: string | null
  setActiveChannelId: (id: string | null) => void
}

// Combined store type
interface Store extends MessagesState, OnlineUsersState, UserState, ChannelsState {}

// Create store
export const useStore = create<Store>((set) => ({
  // Messages slice
  messages: {},
  messagesLoading: {},
  addMessage: (channelId, message) => {
    if (typeof channelId !== 'string') return
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: [...(state.messages[channelId] || []), message],
      },
    }))
  },
  setMessages: (channelId, messages) => {
    if (typeof channelId !== 'string') return
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: messages,
      },
    }))
  },
  setMessagesLoading: (channelId, loading) => {
    if (typeof channelId !== 'string') return
    set((state) => ({
      messagesLoading: {
        ...state.messagesLoading,
        [channelId]: loading,
      },
    }))
  },

  // Online users slice
  onlineUsers: [],
  setOnlineUsers: (users) => set({ onlineUsers: users }),

  // User data slice
  userData: null,
  setUserData: (data) => set({ userData: data }),

  // Channels slice
  channels: [],
  setChannels: (channels) => set({ channels }),
  activeChannelId: null,
  setActiveChannelId: (id) => set({ activeChannelId: id }),
}))

