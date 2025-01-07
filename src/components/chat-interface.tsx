'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Hash } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { MessageEditor } from '@/components/message-editor'
import { User } from '@supabase/supabase-js'
import { MessageList } from './message-list'
import { ChannelList } from './channel-list'
import { DirectMessagesList } from './direct-messages-list'
import { UserMenu } from './user-menu'
import { useRealTimeMessages } from '@/hooks/use-real-time-messages'
import { useUserData } from '@/hooks/use-user-data'
import { useChannels } from '@/hooks/use-channels'
import { useMessageSender } from '@/hooks/use-message-sender'

interface ChatInterfaceProps {
  user: User
}

// Temporary mock data for direct messages
const MOCK_DIRECT_MESSAGES = [
  { id: '1', name: 'John Doe' },
  { id: '2', name: 'Jane Smith' },
]

export function ChatInterface({ user }: ChatInterfaceProps) {
  const userData = useUserData(user.id)
  const { channels, currentChannel, handleChannelSelect } = useChannels()
  const messages = useRealTimeMessages(currentChannel?.id)
  const sendMessage = useMessageSender(userData?.id, currentChannel?.id)

  const userInitials = userData?.name
    ? userData.name.substring(0, 2).toUpperCase()
    : user.email?.substring(0, 2).toUpperCase() ?? '??'

  const handleDirectMessageSelect = (message: { id: string; name: string }) => {
    // TODO: Implement direct message selection
    console.log('Selected direct message:', message)
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="flex flex-col w-64 border-r bg-zinc-50">
        <div className="p-4 border-b">
          <h1 className="font-semibold">ChatGenius</h1>
        </div>

        <ScrollArea className="flex-1">
          <ChannelList
            channels={channels}
            currentChannel={currentChannel}
            onChannelSelect={handleChannelSelect}
          />

          <Separator className="mx-4 my-2" />

          <DirectMessagesList
            messages={MOCK_DIRECT_MESSAGES}
            onSelect={handleDirectMessageSelect}
          />
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
        <MessageList messages={messages} />

        {/* Message Editor */}
        <MessageEditor onSend={sendMessage} />
      </div>
    </div>
  )
}
