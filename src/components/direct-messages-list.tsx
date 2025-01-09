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
import { useIdleDetection } from '@/hooks/use-idle-detection'
import { useRouter } from 'next/navigation'
import { getOrCreateDMChannel } from '@/lib/actions'
import { useMemo } from 'react'

export function DirectMessagesList({ userId }: { userId: string }) {
  const { onlineUsers } = useOnlineUsers({ userId })
  const currentUser = useUserData(userId)
  const router = useRouter()
  const { isIdle } = useIdleDetection()

  // Memoize filtered users to prevent unnecessary recalculations
  const otherOnlineUsers = useMemo(() => {
    return onlineUsers.filter(user => user.id !== currentUser?.id)
  }, [onlineUsers, currentUser?.id])

  const handleUserClick = async (otherUserId: string) => {
    try {
      const channel = await getOrCreateDMChannel(userId, otherUserId)
      router.push(`/chat/${channel.id}`)
    } catch (error) {
      console.error('Failed to create or get DM channel:', error)
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'away':
        return 'text-yellow-500'
      case 'online':
        return 'text-green-500'
      default:
        return 'text-gray-500'
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
          {currentUser && (
            <Button
              key={currentUser.id}
              variant="ghost"
              className="flex items-center gap-1 justify-start w-full hover:bg-zinc-200 py-1 h-auto"
            >
              <Circle className={`scale-[0.5] ${getStatusColor(isIdle ? 'away' : 'online')} fill-current`} />
              {currentUser.name || currentUser.email} <span className="text-zinc-400 ml-1 text-[13px] inline-flex items-center font-extralight">you</span>
            </Button>
          )}
          {otherOnlineUsers.map(user => (
            <Button
              key={user.id}
              variant="ghost"
              className="flex items-center gap-1 justify-start w-full hover:bg-zinc-200 py-1 h-auto"
              onClick={() => handleUserClick(user.id)}
            >
              <Circle className={`scale-[0.5] ${getStatusColor(user.status)} fill-current`} />
              {user.name || user.email}
            </Button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
