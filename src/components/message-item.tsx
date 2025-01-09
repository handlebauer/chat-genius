'use client'

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MoreHorizontal, SmilePlus, MessageSquare } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MessageAttachments } from './message-attachments'
import { ThreadView } from './thread-view'
import type { Database } from '@/lib/supabase/types'

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

interface Message {
  id: string
  content: string
  sender: Database['public']['Tables']['users']['Row']
  created_at: string
  channel_id: string
  attachments?: Database['public']['Tables']['attachments']['Row'][]
  thread?: Thread
}

interface MessageItemProps {
  message: Message
  isHighlighted: boolean
  openMenuId: string | null
  expandedThreadId: string | null
  newlyCreatedThreadIds: Set<string>
  currentUser: Database['public']['Tables']['users']['Row']
  onOpenMenuChange: (open: boolean, messageId: string) => void
  onCreateThread: (messageId: string, channelId: string) => void
  onThreadToggle: (threadId: string, isNewlyCreated: boolean) => void
  messageRef?: (el: HTMLDivElement | null) => void
}

export function MessageItem({
  message,
  isHighlighted,
  openMenuId,
  expandedThreadId,
  newlyCreatedThreadIds,
  currentUser,
  onOpenMenuChange,
  onCreateThread,
  onThreadToggle,
  messageRef
}: MessageItemProps) {
  const thread = message.thread

  return (
    <div
      ref={messageRef}
      className={cn(
        "relative transition-colors duration-200",
        isHighlighted && "bg-yellow-100 rounded-lg",
        (openMenuId === message.id || (thread && expandedThreadId === thread.id && !newlyCreatedThreadIds.has(thread.id))) ? "bg-zinc-100" : "hover:bg-zinc-100",
        "rounded-lg group"
      )}
    >
      <div className="flex gap-2 items-start p-1 pb-[2px]">
        <Avatar className="w-7 h-7 mt-[2px]">
          <AvatarImage
            src={message.sender.avatar_url || undefined}
            alt={message.sender.name || message.sender.email}
          />
          <AvatarFallback className="text-xs">
            {message.sender.name
              ? message.sender.name.substring(0, 2).toUpperCase()
              : message.sender.email.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-0.5 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">{message.sender.name || message.sender.email.split('@')[0]}</span>
            <span className="text-[11px] text-zinc-500 font-normal">
              {new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
            </span>
          </div>
          <div className="text-[13px] leading-relaxed text-zinc-800" dangerouslySetInnerHTML={{ __html: message.content }} />
          {message.attachments && <MessageAttachments attachments={message.attachments} />}
        </div>
        <div className={cn(
          "opacity-0 group-hover:opacity-100 transition-opacity",
          openMenuId === message.id && "opacity-100"
        )}>
          <DropdownMenu open={openMenuId === message.id} onOpenChange={(open) => onOpenMenuChange(open, message.id)}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 hover:bg-zinc-200 focus-visible:ring-0 cursor-pointer bg-zinc-50/80 shadow-sm",
                  openMenuId === message.id && "bg-zinc-200"
                )}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="gap-2 cursor-pointer">
                <SmilePlus className="h-4 w-4" />
                Add reaction
              </DropdownMenuItem>
              {(!thread || thread.reply_count === 0) && (
                <DropdownMenuItem
                  className="gap-2 cursor-pointer"
                  onClick={() => onCreateThread(message.id, message.channel_id)}
                >
                  <MessageSquare className="h-4 w-4" />
                  Create thread
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {thread && currentUser && (
        <div className="pb-1">
          <ThreadView
            thread={thread}
            isExpanded={expandedThreadId === thread.id}
            onToggle={() => {
              onThreadToggle(thread.id, newlyCreatedThreadIds.has(thread.id))
            }}
            currentUser={currentUser}
            isNewlyCreated={newlyCreatedThreadIds.has(thread.id)}
          />
        </div>
      )}
    </div>
  )
}
