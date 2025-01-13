// 'use client'

import { User } from '@supabase/supabase-js'
import { useChatData } from '@/hooks/use-chat-data'
import { ClientSideWrapper } from './client-side-wrapper'

interface ChatInterfaceProps {
    user: User
    channelId: string
}

export async function ChatInterface({ user, channelId }: ChatInterfaceProps) {
    const chatData = await useChatData(user, channelId)

    if (!chatData) {
        return null
    }

    const {
        userData,
        channels,
        directMessages,
        currentChannelMembers,
        channelMemberships,
    } = chatData

    return (
        <div className="flex h-screen">
            <ClientSideWrapper
                channelId={channelId}
                userData={userData}
                initialData={{ channels, directMessages, channelMemberships }}
                currentChannelMembers={currentChannelMembers}
            />
        </div>
    )
}
