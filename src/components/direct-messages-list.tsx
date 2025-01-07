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

export function DirectMessagesList({ userId }: { userId: string }) {
  const { onlineUsers } = useOnlineUsers({ userId })
  const currentUser = useUserData(userId)

  // Filter out the current user from the online users list
  const otherOnlineUsers = onlineUsers.filter(user => user.id !== currentUser?.id)

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
              <Circle className="scale-[0.5] text-green-500 fill-current" />
              {currentUser.name || currentUser.email} <span className="text-zinc-400 ml-1 text-[13px] inline-flex items-center font-extralight">you</span>
            </Button>
          )}
          {otherOnlineUsers.map(user => (
            <Button
              key={user.id}
              variant="ghost"
              className="flex items-center gap-1 justify-start w-full hover:bg-zinc-200 py-1 h-auto"
            >
              <Circle className="scale-[0.5] text-green-500 fill-current" />
              {user.name || user.email}
            </Button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
