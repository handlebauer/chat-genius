'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { LogOut, Hash, MessageSquare, ChevronDown } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { MessageEditor } from '@/components/message-editor'
import { User } from '@supabase/supabase-js'
import { signOutAction } from '@/lib/actions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import { cn } from '@/lib/utils'

interface ChatInterfaceProps {
  user: User
}

export function ChatInterface({ user }: ChatInterfaceProps) {
  const handleSendMessage = (content: string) => {
    // TODO: Implement sending messages
    console.log('Message sent:', content)
  }

  const userInitials = user.email ? user.email.substring(0, 2).toUpperCase() : '??'

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="flex flex-col w-64 border-r bg-zinc-50">
        <div className="p-4 border-b">
          <h1 className="font-semibold">ChatGenius</h1>
        </div>

        <ScrollArea className="flex-1">
          {/* Channels Section */}
          <Collapsible defaultOpen className="px-2">
            <div className="flex items-center px-2 py-2">
              <CollapsibleTrigger className="flex items-center gap-2 hover:text-zinc-600">
                <ChevronDown className="w-4 h-4" />
                <h2 className="text-sm font-semibold text-zinc-500">Channels</h2>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="space-y-1 px-2">
                <Button variant="ghost" className="justify-start w-full">
                  <Hash className="mr-2 w-4 h-4" />
                  general
                </Button>
                <Button variant="ghost" className="justify-start w-full">
                  <Hash className="mr-2 w-4 h-4" />
                  random
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator className="my-2 mx-4" />

          {/* Direct Messages Section */}
          <Collapsible defaultOpen className="px-2">
            <div className="flex items-center px-2 py-2">
              <CollapsibleTrigger className="flex items-center gap-2 hover:text-zinc-600">
                <ChevronDown className="w-4 h-4" />
                <h2 className="text-sm font-semibold text-zinc-500">Direct Messages</h2>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="space-y-1 px-2">
                <Button variant="ghost" className="justify-start w-full">
                  <MessageSquare className="mr-2 w-4 h-4" />
                  John Doe
                </Button>
                <Button variant="ghost" className="justify-start w-full">
                  <MessageSquare className="mr-2 w-4 h-4" />
                  Jane Smith
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Chat Header */}
        <div className="flex justify-between items-center px-4 h-14 border-b">
          <div className="flex items-center">
            <Hash className="mr-2 w-5 h-5" />
            <h2 className="font-semibold">general</h2>
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuItem disabled>{user.email}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <form action={signOutAction}>
                <DropdownMenuItem asChild>
                  <button className="flex items-center w-full">
                    <LogOut className="mr-2 w-4 h-4" />
                    Sign out
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Messages Area */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Sample Messages */}
            <div className="relative group">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-full bg-zinc-200 shrink-0" />
                <div className="space-y-1">
                  <div className="flex gap-2 items-center">
                    <span className="font-medium">John Doe</span>
                    <span className="text-xs text-zinc-500">12:34 PM</span>
                  </div>
                  <div className="text-sm">
                    Hello, world!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Message Editor */}
        <MessageEditor onSend={handleSendMessage} />
      </div>
    </div>
  )
}
