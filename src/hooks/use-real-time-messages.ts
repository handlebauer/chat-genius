import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

interface Message {
  id: string
  content: string
  sender: Database['public']['Tables']['users']['Row']
  created_at: string
  channel_id: string
}

type MessageRow = {
  id: string
  sender_id: string
  channel_id: string
  thread_id: string | null
  content: string
  created_at: string
  updated_at: string
}

function isMessageRow(obj: any): obj is MessageRow {
  return (
    obj &&
    typeof obj.id === 'string' &&
    typeof obj.channel_id === 'string' &&
    typeof obj.content === 'string'
  )
}

export function useRealTimeMessages(channelId: string | undefined) {
  const [messages, setMessages] = useState<Message[]>([])
  const supabase = createClientComponentClient<Database>()

  // Load initial messages
  useEffect(() => {
    if (!channelId) return

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
        .eq('channel_id', channelId)
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
  }, [channelId, supabase])

  // Set up real-time subscription
  useEffect(() => {
    if (!channelId) return

    const channel = supabase
      .channel(`channel-${channelId}`, {
        config: {
          broadcast: { self: true },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload: RealtimePostgresChangesPayload<MessageRow>) => {
          if (!payload.new || !isMessageRow(payload.new)) return

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

    channel.subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase, channelId])

  return messages
}
