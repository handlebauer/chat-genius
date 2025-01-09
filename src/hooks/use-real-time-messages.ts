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

interface ThreadReply {
  id: string
  content: string
  sender: Database['public']['Tables']['users']['Row']
  created_at: string
}

interface Thread {
  id: string
  reply_count: number
  last_reply_at: string
  replies: ThreadReply[]
}

interface Message {
  id: string
  content: string
  sender: Database['public']['Tables']['users']['Row']
  created_at: string
  channel_id: string
  attachments?: Database['public']['Tables']['attachments']['Row'][]
  thread?: Thread
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

      // First, get all threads in this channel to map parent messages
      const { data: threadsData } = await supabase
        .from('threads')
        .select(`
          id,
          parent_message_id,
          created_at,
          replies:messages!thread_id(
            id,
            content,
            created_at,
            sender:users!messages_sender_id_fkey(
              id,
              name,
              email,
              avatar_url,
              status,
              created_at,
              updated_at
            )
          )
        `)
        .eq('channel_id', channelId)

      // Create a map of parent message IDs to their thread data
      const threadMap = new Map(
        threadsData?.map(thread => {
          const replies = (thread.replies || []).map(reply => ({
            id: reply.id,
            content: reply.content,
            created_at: reply.created_at,
            sender: reply.sender as unknown as Database['public']['Tables']['users']['Row']
          }))

          return [
            thread.parent_message_id,
            {
              id: thread.id,
              reply_count: replies.length,
              last_reply_at: replies.length
                ? replies[replies.length - 1].created_at
                : thread.created_at,
              replies
            }
          ]
        }) || []
      )

      // Then get all messages with their basic data
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          channel_id,
          sender:users!messages_sender_id_fkey(
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
        .is('thread_id', null) // Only get main messages, not thread replies
        .order('created_at')

      if (messagesError) {
        console.error('Error loading messages:', messagesError)
        setMessagesLoading(channelId, false)
        return
      }

      if (messagesData) {
        // Combine messages with their thread data
        const messagesWithThreads = messagesData.map(message => ({
          ...message,
          sender: message.sender as unknown as Database['public']['Tables']['users']['Row'],
          thread: threadMap.get(message.id)
        })) as unknown as Message[]

        setMessages(channelId, messagesWithThreads)
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

          // For new messages, we need to check if it's a thread reply or a main message
          if (payload.new.thread_id) {
            // It's a thread reply, we need to update the parent message's thread data
            const { data: threadData } = await supabase
              .from('threads')
              .select(`
                id,
                parent_message_id,
                created_at,
                replies:messages!thread_id(
                  id,
                  content,
                  created_at,
                  sender:users!messages_sender_id_fkey(
                    id,
                    name,
                    email,
                    avatar_url,
                    status,
                    created_at,
                    updated_at
                  )
                )
              `)
              .eq('id', payload.new.thread_id)
              .single()

            if (threadData) {
              // Update the parent message with new thread data
              const currentMessages = messages[channelId] || []
              const parentMessage = currentMessages.find(m => m.id === threadData.parent_message_id)

              if (parentMessage) {
                const replies = (threadData.replies || []).map(reply => ({
                  id: reply.id,
                  content: reply.content,
                  created_at: reply.created_at,
                  sender: reply.sender as unknown as Database['public']['Tables']['users']['Row']
                }))

                const updatedMessage = {
                  ...parentMessage,
                  thread: {
                    id: threadData.id,
                    reply_count: replies.length,
                    last_reply_at: replies[replies.length - 1]?.created_at || threadData.created_at,
                    replies
                  }
                } as unknown as Message

                setMessages(
                  channelId,
                  currentMessages.map(m => m.id === updatedMessage.id ? updatedMessage : m)
                )
              }
            }
          } else {
            // It's a new main message, fetch it with its data
            const { data: messageData } = await supabase
              .from('messages')
              .select(`
                id,
                content,
                created_at,
                channel_id,
                sender:users!messages_sender_id_fkey(
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
              const message = {
                ...messageData,
                sender: messageData.sender as unknown as Database['public']['Tables']['users']['Row']
              }
              addMessage(channelId, message as Message)
            }
          }
        }
      )

    channel.subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase, channelId, messages, setMessages, addMessage])

  return {
    messages: channelId ? messages[channelId] || [] : [],
    loading: channelId ? useStore.getState().messagesLoading[channelId] || false : false
  }
}
