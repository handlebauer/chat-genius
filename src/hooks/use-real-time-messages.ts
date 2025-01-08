import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useStore } from '@/lib/store'

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
  const supabase = createClientComponentClient<Database>()
  const { messages, setMessages, setMessagesLoading, addMessage } = useStore()

  // Load initial messages
  useEffect(() => {
    if (!channelId) return

    async function loadMessages() {
      setMessagesLoading(channelId, true)

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
          ),
          attachments(
            id,
            file_name,
            file_size,
            file_type,
            storage_path,
            content_type,
            created_at,
            updated_at
          )
        `)
        .eq('channel_id', channelId)
        .order('created_at')

      if (messagesError) {
        console.error('Error loading messages:', messagesError)
        setMessagesLoading(channelId, false)
        return
      }

      if (messagesData) {
        setMessages(channelId, messagesData as any)
      }

      setMessagesLoading(channelId, false)
    }

    loadMessages()
  }, [channelId, supabase, setMessages, setMessagesLoading])

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
              ),
              attachments(
                id,
                file_name,
                file_size,
                file_type,
                storage_path,
                content_type,
                created_at,
                updated_at
              )
            `)
            .eq('id', payload.new.id)
            .single()

          if (messageData) {
            addMessage(channelId, messageData as any)
          }
        }
      )

    channel.subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase, channelId, addMessage])

  return {
    messages: channelId ? messages[channelId] || [] : [],
    loading: channelId ? useStore.getState().messagesLoading[channelId] || false : false
  }
}
