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
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

interface Message {
  id: string
  content: string
  sender: Database['public']['Tables']['users']['Row']
  created_at: string
  channel_id: string
}

type MessageWithSender = Database['public']['Tables']['messages']['Row'] & {
  sender: Database['public']['Tables']['users']['Row']
}

type Channel = Database['public']['Tables']['channels']['Row']

interface ChatInterfaceProps {
  user: User
}

export function ChatInterface({ user }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [channels, setChannels] = useState<Channel[]>([])
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null)
  const [userData, setUserData] = useState<Database['public']['Tables']['users']['Row'] | null>(null)
  const supabase = createClientComponentClient<Database>()

  // Load user data
  useEffect(() => {
    async function loadUserData() {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error loading user data:', error)
        return
      }

      setUserData(data)
    }

    loadUserData()
  }, [user.id, supabase])

  // Load channels and set initial channel
  useEffect(() => {
    async function loadChannels() {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error loading channels:', error)
        return
      }

      setChannels(data)
      // Set initial channel to #general
      const generalChannel = data.find(channel => channel.name === 'general')
      if (generalChannel) {
        setCurrentChannel(generalChannel)
      }
    }

    loadChannels()
  }, [supabase])

  // Load messages for current channel
  useEffect(() => {
    if (!currentChannel?.id) return

    async function loadMessages() {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          channel_id,
          sender:sender_id(
            id,
            name,
            email,
            avatar_url,
            status,
            created_at,
            updated_at
          )
        `)
        .eq('channel_id', currentChannel?.id)
        .order('created_at')

      if (messagesError) {
        console.error('Error loading messages:', messagesError)
        return
      }

      if (messagesData) {
        setMessages(messagesData as unknown as Message[])
      }
    }

    loadMessages()

    // Subscribe to new messages
    const channelId = currentChannel.id
    const channel = supabase
      .channel(`channel-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Fetch the complete message with sender info
          const { data: messageData } = await supabase
            .from('messages')
            .select(`
              id,
              content,
              created_at,
              channel_id,
              sender:sender_id(
                id,
                name,
                email,
                avatar_url,
                status,
                created_at,
                updated_at
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (messageData) {
            setMessages(prev => [...prev, messageData as unknown as Message])
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [currentChannel, supabase])

  const handleSendMessage = async (content: string) => {
    if (!userData || !currentChannel) return

    const { error } = await supabase
      .from('messages')
      .insert({
        content,
        channel_id: currentChannel.id,
        sender_id: userData.id,
      })

    if (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleChannelSelect = (channel: Channel) => {
    setCurrentChannel(channel)
  }

  const userInitials = userData?.name
    ? userData.name.substring(0, 2).toUpperCase()
    : user.email?.substring(0, 2).toUpperCase() ?? '??'

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
                      "justify-start w-full",
                      currentChannel?.id === channel.id && "bg-zinc-200"
                    )}
                    onClick={() => handleChannelSelect(channel)}
                  >
                    <Hash className="mr-2 w-4 h-4" />
                    {channel.name}
                  </Button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator className="mx-4 my-2" />

          {/* Direct Messages Section */}
          <Collapsible defaultOpen className="px-2">
            <div className="flex items-center px-2 py-2">
              <CollapsibleTrigger className="flex gap-2 items-center hover:text-zinc-600">
                <ChevronDown className="w-4 h-4" />
                <h2 className="text-sm font-semibold text-zinc-500">Direct Messages</h2>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>
              <div className="px-2 space-y-1">
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
            <h2 className="font-semibold">{currentChannel?.name || 'Select a channel'}</h2>
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
                  <button className="flex items-center w-full cursor-pointer">
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
            {messages.map(message => (
              <div key={message.id} className="relative group">
                <div className="flex gap-3 items-start">
                  <div className="flex justify-center items-center w-8 h-8 text-sm font-medium rounded-full bg-zinc-200 shrink-0">
                    {message.sender.name
                      ? message.sender.name.substring(0, 2).toUpperCase()
                      : message.sender.email.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <div className="flex gap-2 items-center">
                      <span className="font-medium">{message.sender.name || message.sender.email}</span>
                      <span className="text-xs text-zinc-500">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="text-sm" dangerouslySetInnerHTML={{ __html: message.content }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Message Editor */}
        <MessageEditor onSend={handleSendMessage} />
      </div>
    </div>
  )
}
