import type { Database } from '@/lib/supabase/types'
import type { UserData } from '@/lib/store'

export interface ThreadReply {
    id: string
    content: string
    sender: Database['public']['Tables']['users']['Row']
    created_at: string
}

export interface Thread {
    id: string
    reply_count: number
    last_reply_at: string
    replies: ThreadReply[]
}

export interface Message {
    id: string
    content: string
    sender: Database['public']['Tables']['users']['Row']
    created_at: string
    channel_id: string
    attachments?: Database['public']['Tables']['attachments']['Row'][]
    thread?: Thread
}

export interface MessageListProps {
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
        name?: string | null
        avatar_url?: string | null
    }
}
