'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Database } from '@/lib/supabase/types'

interface Message {
  id: string
  content: string
  sender: Database['public']['Tables']['users']['Row']
  created_at: string
  channel_id: string
}

interface MessageListProps {
  messages: Message[]
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <ScrollArea className="flex-1">
      <div className="p-4 space-y-6">
        {messages.map(message => (
          <div key={message.id} className="relative group">
            <div className="flex gap-3 items-start">
              <Avatar className="w-8 h-8">
                <AvatarImage
                  src={message.sender.avatar_url || undefined}
                  alt={message.sender.name || message.sender.email}
                />
                <AvatarFallback className="text-sm font-medium">
                  {message.sender.name
                    ? message.sender.name.substring(0, 2).toUpperCase()
                    : message.sender.email.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex gap-2 items-center">
                  <span className="font-medium">{message.sender.name || message.sender.email.split('@')[0]}</span>
                  <span className="text-xs text-zinc-500">
                    {new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </span>
                </div>
                <div className="text-sm" dangerouslySetInnerHTML={{ __html: message.content }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
