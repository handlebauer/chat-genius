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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ChatInterfaceProps {
  user: User
}

export function ChatInterface({ user }: ChatInterfaceProps) {
  const { channelId } = useParams() as { channelId: string }
  const { channels, getChannelDisplayName, getDMParticipant } = useStore()
  const userData = useUserData(user.id) as Database['public']['Tables']['users']['Row'] | null
  const { messages, loading } = useRealTimeMessages(channelId)
  const sendMessage = useMessageSender(userData?.id, channelId)

  const userInitials = userData?.name
    ? userData.name.substring(0, 2).toUpperCase()
    : user.email?.substring(0, 2).toUpperCase() ?? '??'

  const currentChannel = channels.find(channel => channel.id === channelId)
  const channelDisplayName = getChannelDisplayName(channelId, user.id)
  const dmParticipant = getDMParticipant(channelId, user.id)
  const isDM = currentChannel?.channel_type === 'direct_message'

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="flex flex-col w-64 border-r bg-zinc-50">
        <div className="flex items-center px-4 h-14 border-b">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-800">
            ChatGenius
          </h1>
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
          <div className="flex items-center justify-center">
            {isDM ? (
              <>
                <Avatar className="w-5 h-5 mr-2">
                  <AvatarImage
                    src={dmParticipant?.avatar_url || undefined}
                    alt={channelDisplayName}
                  />
                  <AvatarFallback className="text-xs">
                    {channelDisplayName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="font-medium text-zinc-900">{channelDisplayName || '\u00A0'}</h2>
              </>
            ) : (
              <>
                {channelDisplayName && <Hash className="mr-[2px] w-[18px] h-[18px] text-zinc-900" />}
                <h2 className="font-medium text-zinc-900">{channelDisplayName?.toLowerCase() || '\u00A0'}</h2>
              </>
            )}
          </div>

          <UserMenu
            email={user.email || ''}
            userData={userData}
            userInitials={userInitials}
          />
        </div>

        {/* Messages Area */}
        <MessagesSection messages={messages} loading={loading} />

        {/* Message Editor */}
        <MessageEditor channelName={channelDisplayName || ''} onSend={sendMessage} userId={userData?.id || ''} />
      </div>
    </div>
  )
}
