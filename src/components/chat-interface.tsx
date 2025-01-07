'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Hash } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { User } from '@supabase/supabase-js'
import { MessageList } from './message-list'
import { ChannelList } from './channel-list'
import { MessageEditor } from './message-editor'
import { UserMenu } from './user-menu'
import { useRealTimeMessages } from '@/hooks/use-real-time-messages'
import { useUserData } from '@/hooks/use-user-data'
import { useMessageSender } from '@/hooks/use-message-sender'
import { DirectMessagesList } from '@/components/direct-messages-list'
import { useStore } from '@/lib/store'
import type { Database } from '@/lib/supabase/types'
import { useParams } from 'next/navigation'
import { MessagesSection } from './messages-section'

interface ChatInterfaceProps {
  user: User
}

export function ChatInterface({ user }: ChatInterfaceProps) {
  const { channelId } = useParams() as { channelId: string }
  const { channels } = useStore()
  const userData = useUserData(user.id) as Database['public']['Tables']['users']['Row'] | null
  const messages = useRealTimeMessages(channelId)
  const sendMessage = useMessageSender(userData?.id, channelId)

  const userInitials = userData?.name
    ? userData.name.substring(0, 2).toUpperCase()
    : user.email?.substring(0, 2).toUpperCase() ?? '??'

  const currentChannel = channels.find(channel => channel.id === channelId)

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="flex flex-col w-64 border-r bg-zinc-50">
        <div className="p-4 border-b">
          <h1 className="font-semibold">ChatGenius</h1>
        </div>

        <ScrollArea className="flex-1">
          <ChannelList />
          <Separator className="mx-4 my-2" />
          <DirectMessagesList userId={user.id} />
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Chat Header */}
        <div className="flex justify-between items-center px-4 h-14 border-b">
          <div className="flex items-center">
            <Hash className="mr-2 w-5 h-5" />
            <h2 className="font-semibold">{currentChannel?.name || 'Select a channel'}</h2>
          </div>

          <UserMenu
            email={user.email || ''}
            userData={userData}
            userInitials={userInitials}
          />
        </div>

        {/* Messages Area */}
        <MessagesSection messages={messages} />

        {/* Message Editor */}
        <MessageEditor channelName={currentChannel?.name} onSend={sendMessage} />
      </div>
    </div>
  )
}
