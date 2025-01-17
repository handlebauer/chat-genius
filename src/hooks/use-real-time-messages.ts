import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { useShallow } from 'zustand/react/shallow'
import { createClient } from '@/lib/supabase/client'
import { botUserConfig } from '@/config'
import type { Database } from '@/lib/supabase/types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import {
    parseMentions,
    getMentionedUserIds,
    formatMentionText,
} from '@/lib/utils/mentions'

type MessageRow = {
    id: string
    sender_id: string
    channel_id: string
    thread_id: string | null
    content: string
    created_at: string
    updated_at: string
}

type Channel = Database['public']['Tables']['channels']['Row']

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

export function useRealTimeMessages(channelId: string) {
    const supabase = createClient()
    const messages = useStore(useShallow(state => state.messages))
    const setMessages = useStore(state => state.setMessages)
    const setMessagesLoading = useStore(state => state.setMessagesLoading)
    const addMessage = useStore(state => state.addMessage)
    const userData = useStore(state => state.userData)
    const addMentionedUsers = useStore(state => state.addMentionedUsers)
    const markChannelInitialized = useStore(
        state => state.markChannelInitialized,
    )
    const initializedChannels = useStore(state => state.initializedChannels)
    const channels = useStore(state => state.channels)

    // Load initial messages
    useEffect(() => {
        if (!channelId || !userData) return

        // Skip loading if we've already initialized this channel
        if (initializedChannels.has(channelId)) return

        const currentUserId = userData.id

        async function loadMessages() {
            setMessagesLoading(channelId, true)

            // Get all messages with their basic data
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
                .eq('channel_id', channelId)
                .is('thread_id', null)
                .order('created_at')

            if (messagesError) {
                console.error('Error loading messages:', messagesError)
                setMessagesLoading(channelId, false)
                return
            }

            if (!messagesData) {
                setMessagesLoading(channelId, false)
                return
            }

            // Get all channels for message mentions
            const { data: channelsData } = await supabase
                .from('channels')
                .select('*')

            // Create a map of channel IDs to their data
            const channelsMap = (channelsData || []).reduce(
                (acc, channel) => {
                    if (channel.id) acc[channel.id] = channel
                    return acc
                },
                {} as Record<string, Channel>,
            )

            // Create a map of message IDs to their data for mentions
            const messageMap = messagesData.reduce(
                (acc, msg) => {
                    if (msg.id && msg.channel_id) {
                        acc[msg.id] = { id: msg.id, channelId: msg.channel_id }
                    }
                    return acc
                },
                {} as Record<string, { id: string; channelId: string }>,
            )

            // Then get all threads in this channel to map parent messages
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

            // Fetch mentioned users data
            const mentionedUserIds = getMentionedUserIds(messagesData)
            let mentionedUsers: Record<
                string,
                Database['public']['Tables']['users']['Row']
            > = {}

            if (mentionedUserIds.length > 0) {
                const { data: users } = await supabase
                    .from('users')
                    .select(
                        'id, name, email, avatar_url, status, created_at, updated_at',
                    )
                    .in('id', mentionedUserIds)

                if (users) {
                    mentionedUsers = users.reduce(
                        (acc, user) => {
                            acc[user.id] = user
                            return acc
                        },
                        {} as Record<
                            string,
                            Database['public']['Tables']['users']['Row']
                        >,
                    )
                    // Add mentioned users to the global store
                    addMentionedUsers(mentionedUsers)
                }
            }

            // Combine messages with their thread data and format mentions
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

                    // Format mentions with user and channel data
                    const formattedContent = formatMentionText(
                        message.content,
                        mentionedUsers,
                        messageMap,
                        channelsMap,
                    )

                    return {
                        ...message,
                        content: formattedContent,
                        sender: message.sender as unknown as Database['public']['Tables']['users']['Row'],
                        thread: threadMap.get(message.id),
                        reactions,
                    }
                },
            ) as unknown as Message[]

            setMessages(channelId, messagesWithThreadsAndReactions)
            setMessagesLoading(channelId, false)
            markChannelInitialized(channelId)
        }

        loadMessages()
    }, [
        channelId,
        userData,
        supabase,
        setMessages,
        setMessagesLoading,
        addMentionedUsers,
        initializedChannels,
        markChannelInitialized,
    ])

    // Subscribe to real-time updates
    useEffect(() => {
        if (!channelId || !userData) return

        const currentUserId = userData.id

        // Find the bot's DM channel with the current user
        const botDmChannel = channels.find(
            c =>
                c.channel_type === 'direct_message' &&
                c.name.includes(userData.id) &&
                c.name.includes(botUserConfig.email),
        )

        // Create a filter for both the current channel and the bot's DM channel
        const filter = botDmChannel
            ? `channel_id=eq.${channelId},channel_id=eq.${botDmChannel.id}`
            : `channel_id=eq.${channelId}`

        // Subscribe to message changes
        const subscription = supabase
            .channel('messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter,
                },
                async payload => {
                    const { new: newMessage } = payload
                    if (!isMessageRow(newMessage)) return

                    // Get the sender's information
                    const { data: sender } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', newMessage.sender_id)
                        .single()

                    if (!sender) return

                    // Get any attachments
                    const { data: attachments } = await supabase
                        .from('attachments')
                        .select('*')
                        .eq('message_id', newMessage.id)

                    // Get any reactions
                    const { data: reactions } = await supabase
                        .from('reactions')
                        .select('emoji, user_id')
                        .eq('message_id', newMessage.id)

                    // Process reactions
                    const reactionGroups = (reactions || []).reduce(
                        (acc, reaction) => {
                            if (!acc[reaction.emoji]) {
                                acc[reaction.emoji] = {
                                    emoji: reaction.emoji,
                                    count: 0,
                                    hasReacted: false,
                                }
                            }
                            acc[reaction.emoji].count++
                            if (reaction.user_id === currentUserId) {
                                acc[reaction.emoji].hasReacted = true
                            }
                            return acc
                        },
                        {} as Record<string, Reaction>,
                    )

                    // Handle mentions in the new message
                    const { userIds } = parseMentions(newMessage.content)
                    let formattedContent = newMessage.content

                    if (userIds.length > 0) {
                        const { data: mentionedUsers } = await supabase
                            .from('users')
                            .select('*')
                            .in('id', userIds)

                        if (mentionedUsers) {
                            const mentionedUsersMap = mentionedUsers.reduce(
                                (acc, user) => {
                                    acc[user.id] = user
                                    return acc
                                },
                                {} as Record<
                                    string,
                                    Database['public']['Tables']['users']['Row']
                                >,
                            )
                            addMentionedUsers(mentionedUsersMap)
                            formattedContent = formatMentionText(
                                newMessage.content,
                                mentionedUsersMap,
                            )
                        }
                    }

                    // Add the message to the store
                    addMessage(newMessage.channel_id, {
                        id: newMessage.id,
                        content: formattedContent,
                        sender,
                        created_at: newMessage.created_at,
                        channel_id: newMessage.channel_id,
                        attachments: attachments || undefined,
                        reactions: Object.values(reactionGroups),
                    })
                },
            )
            .subscribe()

        return () => {
            subscription.unsubscribe()
        }
    }, [channelId, userData, channels])

    return {
        messages: channelId ? messages[channelId] || [] : [],
        loading: channelId
            ? !initializedChannels.has(channelId) ||
              useStore.getState().messagesLoading[channelId] ||
              false
            : false,
    }
}
