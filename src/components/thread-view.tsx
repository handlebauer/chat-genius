'use client'

import { useRef, useState, KeyboardEvent, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from '@/components/ui/button'
import { Input } from "@/components/ui/input"
import { cn } from '@/lib/utils'
import { MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { createThreadReply } from '@/lib/actions'
import { useClickOutside } from '@/hooks/use-click-outside'
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

interface ThreadViewProps {
  thread: Thread
  isExpanded: boolean
  onToggle: () => void
  currentUser: Database['public']['Tables']['users']['Row']
  isNewlyCreated?: boolean
}

interface ThreadHeaderProps {
  replyCount?: number
  lastReplyAt?: string
  isNewThread?: boolean
  onClick?: () => void
}

function ThreadHeader({ replyCount = 0, lastReplyAt, isNewThread, onClick }: ThreadHeaderProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        "h-6 px-2 text-xs flex items-center gap-2 w-full justify-start mt-0.5",
        isNewThread ? "cursor-default hover:bg-transparent text-zinc-500" : "text-zinc-500 hover:text-zinc-900 group/thread"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <div className="w-3.5 flex-none text-zinc-500">
        <MessageSquare className="h-3.5 w-3.5" />
      </div>
      <div className="flex items-center gap-2 flex-1">
        {isNewThread ? (
          <span className="select-none">New thread</span>
        ) : (
          <>
            <span className="group-hover/thread:underline">{replyCount} repl{replyCount === 1 ? 'y' : 'ies'}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(lastReplyAt!))} ago</span>
          </>
        )}
      </div>
    </Button>
  )
}

interface ReplyInputProps {
  currentUser: Database['public']['Tables']['users']['Row']
  replyText: string
  onReplyChange: (text: string) => void
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
  isSubmitting: boolean
  placeholder: string
  inputRef?: React.RefObject<HTMLInputElement | null>
}

function ReplyInput({ currentUser, replyText, onReplyChange, onKeyDown, isSubmitting, placeholder, inputRef }: ReplyInputProps) {
  return (
    <div className="flex gap-2 items-center">
      <Avatar className="w-6 h-6 flex-none">
        <AvatarImage
          src={currentUser.avatar_url || undefined}
          alt={currentUser.name || currentUser.email}
        />
        <AvatarFallback className="text-xs">
          {currentUser.name
            ? currentUser.name.substring(0, 2).toUpperCase()
            : currentUser.email.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <Input
        ref={inputRef}
        value={replyText}
        onChange={(e) => onReplyChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={cn(
          "h-8 text-sm bg-zinc-50 border-zinc-200 focus-visible:ring-zinc-400",
          isSubmitting && "opacity-50 cursor-not-allowed"
        )}
        disabled={isSubmitting}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

export function ThreadView({ thread, isExpanded, onToggle, currentUser, isNewlyCreated }: ThreadViewProps) {
  const [replyText, setReplyText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const containerRef = useClickOutside<HTMLDivElement>({
    onClickOutside: () => {
      if (isNewlyCreated && thread.reply_count === 0) {
        onToggle()
      }
    },
    enabled: isNewlyCreated && thread.reply_count === 0 && isExpanded
  })

  useEffect(() => {
    if ((isNewlyCreated || isExpanded) && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isNewlyCreated, isExpanded])

  const handleKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && replyText.trim() && !isSubmitting) {
      try {
        setIsSubmitting(true)
        await createThreadReply(thread.id, replyText)
        setReplyText('')
      } catch (error) {
        console.error('Failed to send reply:', error)
        // TODO: Add error toast notification
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  // If it's a newly created thread and has no replies, show the special new thread view
  if (isNewlyCreated && thread.reply_count === 0) {
    return (
      <div
        ref={containerRef}
        className="ml-9 space-y-2"
        onClick={(e) => e.stopPropagation()}
      >
        <ThreadHeader isNewThread replyCount={0} />
        <div className="space-y-4 border-l-2 border-l-zinc-200 pl-4">
          <ReplyInput
            currentUser={currentUser}
            replyText={replyText}
            onReplyChange={setReplyText}
            onKeyDown={handleKeyDown}
            isSubmitting={isSubmitting}
            placeholder="Start a thread..."
            inputRef={inputRef}
          />
        </div>
      </div>
    )
  }

  // For existing threads with no replies yet, don't show anything
  if (!isNewlyCreated && thread.reply_count === 0) {
    return null
  }

  if (!isExpanded) {
    return (
      <div className="ml-9">
        <ThreadHeader
          replyCount={thread.reply_count}
          lastReplyAt={thread.last_reply_at}
          onClick={onToggle}
        />
      </div>
    )
  }

  return (
    <div className="ml-9">
      <ThreadHeader
        replyCount={thread.reply_count}
        lastReplyAt={thread.last_reply_at}
        onClick={onToggle}
      />
      <div className="mt-2 space-y-2 border-l-2 border-l-zinc-200 pl-4">
        {thread.replies.map(reply => (
          <div key={reply.id} className="flex gap-2 items-start">
            <Avatar className="w-6 h-6">
              <AvatarImage
                src={reply.sender.avatar_url || undefined}
                alt={reply.sender.name || reply.sender.email}
              />
              <AvatarFallback className="text-xs">
                {reply.sender.name
                  ? reply.sender.name.substring(0, 2).toUpperCase()
                  : reply.sender.email.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-0.5 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{reply.sender.name || reply.sender.email.split('@')[0]}</span>
                <span className="text-[11px] text-zinc-500 font-normal">
                  {new Date(reply.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })}
                </span>
              </div>
              <div className="text-[13px] leading-normal text-zinc-800">
                {reply.content}
              </div>
            </div>
          </div>
        ))}
        <div className="pt-1">
          <ReplyInput
            currentUser={currentUser}
            replyText={replyText}
            onReplyChange={setReplyText}
            onKeyDown={handleKeyDown}
            isSubmitting={isSubmitting}
            placeholder="Reply to thread..."
            inputRef={inputRef}
          />
        </div>
      </div>
    </div>
  )
}
