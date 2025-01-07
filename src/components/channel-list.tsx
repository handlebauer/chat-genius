'use client'

import { Button } from '@/components/ui/button'
import { Hash, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { useChannels } from '@/hooks/use-channels'
import { useRouter, useParams } from 'next/navigation'
import type { Database } from '@/lib/supabase/types'

type Channel = Database['public']['Tables']['channels']['Row']

function ChannelButton({
  channel,
  isActive,
  onClick
}: {
  channel: Channel
  isActive: boolean
  onClick: () => void
}) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "justify-start w-full hover:bg-zinc-100",
        isActive && "bg-zinc-200 hover:bg-zinc-200"
      )}
      onClick={onClick}
    >
      <Hash className="w-4 h-4" />
      {channel.name}
    </Button>
  )
}

function ChannelListHeader() {
  return (
    <div className="flex items-center px-2 py-2">
      <CollapsibleTrigger className="flex gap-2 items-center hover:text-zinc-600">
        <ChevronDown className="w-4 h-4" />
        <h2 className="text-sm font-semibold text-zinc-500">Channels</h2>
      </CollapsibleTrigger>
    </div>
  )
}

export function ChannelList() {
  const { channels } = useChannels()
  const router = useRouter()
  const { channelId } = useParams() as { channelId: string }

  const regularChannels = channels.filter(channel => channel.channel_type === 'channel')

  return (
    <Collapsible defaultOpen className="px-2">
      <ChannelListHeader />
      <CollapsibleContent>
        <div className="pl-3 space-y-1">
          {regularChannels.map(channel => (
            <ChannelButton
              key={channel.id}
              channel={channel}
              isActive={channelId === channel.id}
              onClick={() => router.push(`/chat/${channel.id}`)}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
