import { useEffect } from 'react'
import type { Database } from '@/lib/supabase/types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'

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
    reactions?: Reaction[]
}

interface Reaction {
    emoji: string
    count: number
    hasReacted: boolean
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
    const supabase = createClient()
    const { messages, setMessages, setMessagesLoading, addMessage, userData } =
        useStore()

    // Load initial messages
    useEffect(() => {
        if (!channelId || !userData) return // Don't load messages until we have both channelId and userData
        const currentUserId = userData.id

        async function loadMessages() {
            setMessagesLoading(channelId, true)

            // First, get all threads in this channel to map parent messages
            const { data: threadsData } = await supabase
                .from('threads')
                .select(
                    `
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
        `,
                )
                .eq('channel_id', channelId as string)

            // Create a map of parent message IDs to their thread data
            const threadMap = new Map(
                threadsData?.map(thread => {
                    const replies = (thread.replies || []).map(reply => ({
                        id: reply.id,
                        content: reply.content,
                        created_at: reply.created_at,
                        sender: reply.sender as unknown as Database['public']['Tables']['users']['Row'],
                    }))

                    return [
                        thread.parent_message_id,
                        {
                            id: thread.id,
                            reply_count: replies.length,
                            last_reply_at: replies.length
                                ? replies[replies.length - 1].created_at
                                : thread.created_at,
                            replies,
                        },
                    ]
                }) || [],
            )

            // Then get all messages with their basic data
            const { data: messagesData, error: messagesError } = await supabase
                .from('messages')
                .select(
                    `
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
          ),
          reactions(
            emoji,
            user_id
          )
        `,
                )
                .eq('channel_id', channelId as string)
                .is('thread_id', null)
                .order('created_at')

            if (messagesError) {
                console.error('Error loading messages:', messagesError)
                setMessagesLoading(channelId, false)
                return
            }

            if (messagesData) {
                // Combine messages with their thread data
                const messagesWithThreadsAndReactions = messagesData.map(
                    message => {
                        // Process reactions
                        const reactionGroups = (message.reactions || []).reduce(
                            (
                                acc: Record<
                                    string,
                                    { count: number; users: string[] }
                                >,
                                reaction: any,
                            ) => {
                                if (
                                    !reaction ||
                                    !reaction.emoji ||
                                    reaction.user_id === null
                                )
                                    return acc

                                if (!acc[reaction.emoji]) {
                                    acc[reaction.emoji] = {
                                        count: 0,
                                        users: [],
                                    }
                                }
                                acc[reaction.emoji].count++
                                acc[reaction.emoji].users.push(reaction.user_id)
                                return acc
                            },
                            {},
                        )

                        const reactions = Object.entries(reactionGroups).map(
                            ([emoji, data]) => {
                                const hasReacted =
                                    data.users.includes(currentUserId)
                                return {
                                    emoji,
                                    count: data.count,
                                    hasReacted,
                                }
                            },
                        )

                        return {
                            ...message,
                            sender: message.sender as unknown as Database['public']['Tables']['users']['Row'],
                            thread: threadMap.get(message.id),
                            reactions,
                        }
                    },
                ) as unknown as Message[]

                setMessages(channelId, messagesWithThreadsAndReactions)
            }

            setMessagesLoading(channelId, false)
        }

        loadMessages()
    }, [channelId, userData, supabase, setMessages, setMessagesLoading])

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
                            .select(
                                `
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
              `,
                            )
                            .eq('id', payload.new.thread_id)
                            .single()

                        if (threadData) {
                            // Update the parent message with new thread data
                            const currentMessages = messages[channelId] || []
                            const parentMessage = currentMessages.find(
                                m => m.id === threadData.parent_message_id,
                            )

                            if (parentMessage) {
                                const replies = (threadData.replies || []).map(
                                    reply => ({
                                        id: reply.id,
                                        content: reply.content,
                                        created_at: reply.created_at,
                                        sender: reply.sender as unknown as Database['public']['Tables']['users']['Row'],
                                    }),
                                )

                                const updatedMessage = {
                                    ...parentMessage,
                                    thread: {
                                        id: threadData.id,
                                        reply_count: replies.length,
                                        last_reply_at:
                                            replies[replies.length - 1]
                                                ?.created_at ||
                                            threadData.created_at,
                                        replies,
                                    },
                                } as unknown as Message

                                setMessages(
                                    channelId,
                                    currentMessages.map(m =>
                                        m.id === updatedMessage.id
                                            ? updatedMessage
                                            : m,
                                    ),
                                )
                            }
                        }
                    } else {
                        // It's a new main message, fetch it with its data
                        const { data: messageData } = await supabase
                            .from('messages')
                            .select(
                                `
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
              `,
                            )
                            .eq('id', payload.new.id)
                            .single()

                        if (messageData) {
                            const message = {
                                ...messageData,
                                sender: messageData.sender as unknown as Database['public']['Tables']['users']['Row'],
                            }
                            addMessage(channelId, message as Message)
                        }
                    }
                },
            )

        channel.subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [supabase, channelId, messages, setMessages, addMessage])

    // Set up real-time subscription for reactions
    useEffect(() => {
        if (!channelId || !userData?.id) return

        type ReactionRecord = Database['public']['Tables']['reactions']['Row']
        type ReactionPayload = RealtimePostgresChangesPayload<ReactionRecord>

        const channel = supabase.channel(`reactions-${channelId}`).on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'reactions',
            },
            async (payload: ReactionPayload) => {
                const record = payload.new || payload.old
                if (
                    !record ||
                    !('message_id' in record) ||
                    !('user_id' in record)
                )
                    return

                const messageId = record.message_id
                if (typeof messageId !== 'string') return

                // Skip if this is our own reaction (handled by optimistic update)
                if (record.user_id === userData.id) return

                // First verify this message belongs to our channel
                const { data: message } = await supabase
                    .from('messages')
                    .select('channel_id')
                    .eq('id', messageId)
                    .single()

                if (!message || message.channel_id !== channelId) return

                // Get the current message from the store
                const currentMessage = messages[channelId]?.find(
                    m => m.id === messageId,
                )
                if (!currentMessage) return

                // Get the updated reactions for the message
                const { data: updatedReactions } = await supabase
                    .from('reactions')
                    .select('emoji, user_id')
                    .eq('message_id', messageId)

                if (updatedReactions) {
                    const reactionGroups = updatedReactions.reduce(
                        (
                            acc: Record<
                                string,
                                { count: number; users: string[] }
                            >,
                            reaction,
                        ) => {
                            if (
                                !reaction ||
                                !reaction.emoji ||
                                reaction.user_id === null
                            )
                                return acc

                            if (!acc[reaction.emoji]) {
                                acc[reaction.emoji] = { count: 0, users: [] }
                            }
                            acc[reaction.emoji].count++
                            acc[reaction.emoji].users.push(reaction.user_id)
                            return acc
                        },
                        {},
                    )

                    const formattedReactions = Object.entries(
                        reactionGroups,
                    ).map(([emoji, data]) => ({
                        emoji,
                        count: data.count,
                        hasReacted: data.users.includes(userData.id),
                    }))

                    // Only update if the reactions have actually changed
                    const currentReactions = currentMessage.reactions || []
                    const hasChanged =
                        JSON.stringify(currentReactions) !==
                        JSON.stringify(formattedReactions)

                    if (hasChanged) {
                        useStore
                            .getState()
                            .updateMessageReactions(
                                messageId,
                                channelId,
                                formattedReactions,
                            )
                    }
                }
            },
        )

        channel.subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [channelId, supabase, userData?.id, messages])

    return {
        messages: channelId ? messages[channelId] || [] : [],
        loading: channelId
            ? useStore.getState().messagesLoading[channelId] || false
            : false,
    }
}
