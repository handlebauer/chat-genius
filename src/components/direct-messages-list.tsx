'use client'

import { Button } from '@/components/ui/button'
import { Circle } from 'lucide-react'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { ChevronDown } from 'lucide-react'
import { useOnlineUsers } from '@/hooks/use-online-users'
import { useUserData } from '@/hooks/use-user-data'
import { useRouter } from 'next/navigation'
import { getOrCreateDMChannel } from '@/lib/actions'
import { cn } from '@/lib/utils'
import type { UserStatus } from '@/lib/store'

type OnlineUser = {
  id: string
  name: string
  email: string | undefined
  status: UserStatus
}

type UserListItemProps = {
  user: OnlineUser
  isCurrentUser?: boolean
  onClick?: (userId: string) => void
}

const StatusIndicator = ({ status }: { status: UserStatus }) => (
  <Circle
    className={cn(
      "scale-[0.5]",
      {
        "text-green-500 fill-current": status === 'online',
        "text-yellow-500 fill-current": status === 'away',
        "text-zinc-300": status === 'offline'
      }
    )}
  />
)

const UserListItem = ({ user, isCurrentUser, onClick }: UserListItemProps) => (
  <Button
    key={user.id}
    variant="ghost"
    className="flex items-center gap-1 justify-start w-full hover:bg-zinc-200 py-1 h-auto group"
    onClick={() => !isCurrentUser && onClick?.(user.id)}
  >
    <StatusIndicator status={user.status} />
    <span className="flex-1 text-left">
      {user.name || user.email}
    </span>
    {isCurrentUser ? (
      <span className="text-zinc-400 text-[13px] inline-flex items-center font-extralight">
        you
      </span>
    ) : user.status === 'away' && (
      <span className="text-zinc-400 text-[13px] opacity-0 group-hover:opacity-100 transition-opacity">
        away
      </span>
    )}
  </Button>
)

interface DirectMessagesListProps {
  userId: string
}

export function DirectMessagesList({ userId }: DirectMessagesListProps) {
  const { onlineUsers } = useOnlineUsers({ userId })
  const currentUser = useUserData(userId)
  const router = useRouter()

  // Memoize filtered users to prevent unnecessary re-renders
  const otherOnlineUsers = onlineUsers.filter(user => user.id !== currentUser?.id)
  const currentUserOnlineData = onlineUsers.find(user => user.id === currentUser?.id)

  const handleUserClick = async (otherUserId: string) => {
    try {
      const channel = await getOrCreateDMChannel(userId, otherUserId)
      router.push(`/chat/${channel.id}`)
    } catch (error) {
      console.error('Failed to create or get DM channel:', error)
    }
  }

  return (
    <Collapsible defaultOpen className="px-2">
      <div className="flex items-center px-2 py-2">
        <CollapsibleTrigger className="flex gap-2 items-center hover:text-zinc-600">
          <ChevronDown className="w-4 h-4" />
          <h2 className="text-sm font-semibold text-zinc-500">Direct Messages</h2>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="px-2">
          {currentUser && currentUserOnlineData && (
            <UserListItem
              user={currentUserOnlineData}
              isCurrentUser={true}
            />
          )}
          {otherOnlineUsers.map(user => (
            <UserListItem
              key={user.id}
              user={user}
              onClick={handleUserClick}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
