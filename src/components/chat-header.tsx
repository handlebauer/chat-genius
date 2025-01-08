'use client'

import { Hash } from 'lucide-react'
import { UserMenu } from './user-menu'
import { useStore } from '@/lib/store'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSearch } from './message-search'
import type { Database } from '@/lib/supabase/types'

type Channel = Database['public']['Tables']['channels']['Row']
type UserData = Database['public']['Tables']['users']['Row']

interface ChatHeaderProps {
  channel: Channel | undefined
  user: {
    id: string
    email: string
    data: UserData | null
  }
}

export function ChatHeader({ channel, user }: ChatHeaderProps) {
  const { getDMParticipant } = useStore()
  const isDM = channel?.channel_type === 'direct_message'
  const dmParticipant = getDMParticipant(channel?.id ?? null, user.id)

  const userInitials = user.data?.name
    ? user.data.name.substring(0, 2).toUpperCase()
    : user.email.substring(0, 2).toUpperCase()

  if (!channel?.name) {
    return (
      <div className="flex justify-between items-center px-4 h-14 border-b">
        <div className="flex-1" />
        <div className="flex items-center gap-4">
          <MessageSearch />
          <UserMenu
            email={user.email}
            userData={user.data}
            userInitials={userInitials}
          />
        </div>
      </div>
    )
  }

  const avatarUrl = dmParticipant?.avatar_url || undefined

  return (
    <div className="flex justify-between items-center px-4 h-14 border-b">
      <div className="flex items-center justify-center">
        {isDM ? (
          <>
            <Avatar className="w-5 h-5 mr-2">
              <AvatarImage
                src={avatarUrl}
                alt={channel.name}
              />
              <AvatarFallback className="text-xs">
                {channel.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h2 className="font-medium text-zinc-900">{channel.name}</h2>
          </>
        ) : (
          <>
            <Hash className="mr-[2px] w-[18px] h-[18px] text-zinc-900" />
            <h2 className="font-medium text-zinc-900">{channel.name.toLowerCase()}</h2>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <MessageSearch />
        <UserMenu
          email={user.email}
          userData={user.data}
          userInitials={userInitials}
        />
      </div>
    </div>
  )
}
