'use client'

import { Button } from '@/components/ui/button'
import { MessageSquare, ChevronDown } from 'lucide-react'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"

interface DirectMessage {
  id: string
  name: string
}

interface DirectMessagesListProps {
  messages: DirectMessage[]
  onSelect: (message: DirectMessage) => void
  currentMessageId?: string
}

export function DirectMessagesList({ messages = [], onSelect, currentMessageId }: DirectMessagesListProps) {
  return (
    <Collapsible defaultOpen className="px-2">
      <div className="flex items-center px-2 py-2">
        <CollapsibleTrigger className="flex gap-2 items-center hover:text-zinc-600">
          <ChevronDown className="w-4 h-4" />
          <h2 className="text-sm font-semibold text-zinc-500">Direct Messages</h2>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="px-2 space-y-1">
          {messages.map(message => (
            <Button
              key={message.id}
              variant="ghost"
              className="justify-start w-full hover:bg-zinc-200"
              onClick={() => onSelect(message)}
            >
              <MessageSquare className="mr-2 w-4 h-4" />
              {message.name}
            </Button>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
