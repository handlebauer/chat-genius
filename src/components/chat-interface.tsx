'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { User } from '@supabase/supabase-js'
import { ChannelList } from './channel-list'
import { MessageEditor } from './message-editor'
import { useRealTimeMessages } from '@/hooks/use-real-time-messages'
import { useUserData } from '@/hooks/use-user-data'
import { useMessageSender } from '@/hooks/use-message-sender'
import { useStore } from '@/lib/store'
import { useParams } from 'next/navigation'
import { MessagesSection } from './messages-section'
import { ChatHeader } from './chat-header'

import type { Database } from '@/lib/supabase/types'
import { useEffect } from 'react'

type UserData = Database['public']['Tables']['users']['Row']

interface ChatInterfaceProps {
    user: User
}

export function ChatInterface({ user }: ChatInterfaceProps) {
    const { channelId } = useParams() as { channelId: string }
    const { getCurrentChannel, setActiveChannelId, channelsLoading } =
        useStore()
    const currentChannel = getCurrentChannel()
    const userData = useUserData(user.id) as UserData | null

    // Ensure activeChannelId stays in sync with route
    useEffect(() => {
        if (!channelsLoading) {
            setActiveChannelId(channelId)
        }
    }, [channelId, setActiveChannelId, channelsLoading])

    const { messages, loading: messagesLoading } =
        useRealTimeMessages(channelId)
    const sendMessage = useMessageSender(userData?.id, channelId)

    return (
        <div className="flex h-screen">
            <div className="flex flex-col w-64 border-r bg-zinc-50">
                <div className="flex items-center px-4 h-14 border-b">
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-800">
                        ChatGenius
                    </h1>
                </div>

                <ScrollArea className="flex-1">
                    <ChannelList />
                </ScrollArea>
            </div>

            <div className="flex flex-col flex-1">
                <ChatHeader
                    channel={channelsLoading ? undefined : currentChannel}
                    user={{
                        id: user.id,
                        email: user.email || 'anonymous@user.com',
                        data: userData,
                    }}
                />

                {!channelsLoading && currentChannel && userData?.id && (
                    <>
                        <MessagesSection
                            messages={messages}
                            loading={messagesLoading}
                        />
                        <MessageEditor
                            channel={currentChannel}
                            userId={userData.id}
                            onSend={sendMessage}
                        />
                    </>
                )}
            </div>
        </div>
    )
}
