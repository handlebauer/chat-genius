'use client'

import { Button } from '@/components/ui/button'
import { Hash } from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/supabase/types'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"

type Channel = Database['public']['Tables']['channels']['Row']

interface ChannelListProps {
  channels: Channel[]
  currentChannel: Channel | null
  onChannelSelect: (channel: Channel) => void
}

export function ChannelList({ channels, currentChannel, onChannelSelect }: ChannelListProps) {
  return (
    <Collapsible defaultOpen className="px-2">
      <div className="flex items-center px-2 py-2">
        <CollapsibleTrigger className="flex gap-2 items-center hover:text-zinc-600">
          <ChevronDown className="w-4 h-4" />
          <h2 className="text-sm font-semibold text-zinc-500">Channels</h2>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="px-2 space-y-1">
          {channels.map(channel => (
            <Button
              key={channel.id}
              variant="ghost"
              className={cn(
                "justify-start w-full hover:bg-zinc-200",
                currentChannel?.id === channel.id && "bg-zinc-200"
              )}
              onClick={() => onChannelSelect(channel)}
            >
              <Hash className="mr-2 w-4 h-4" />
              {channel.name}
            </Button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
