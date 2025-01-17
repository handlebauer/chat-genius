import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/store'
import type { Database } from '@/lib/supabase/types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type UnreadMessage = Database['public']['Tables']['unread_messages']['Row']

export function useUnreadMessages(userId: string, activeChannelId?: string) {
    const setUnreadCount = useStore(state => state.setUnreadCount)
    const clearUnreadCount = useStore(state => state.clearUnreadCount)

    useEffect(() => {
        const supabase = createClient()

        // When entering a channel:
        // 1. Clear unread count immediately for instant feedback
        // 2. Set as active channel in database
        // 3. Reset unread count in database
        if (activeChannelId) {
            clearUnreadCount(activeChannelId)

            Promise.all([
                // Update active channel
                supabase.rpc('set_active_channel', {
                    p_channel_id: activeChannelId,
                }),
                // Reset unread count
                supabase.rpc('reset_unread_count', {
                    p_channel_id: activeChannelId,
                    p_user_id: userId,
                }),
            ]).catch(console.error)
        }

        // Subscribe to changes in unread_messages table
        const unreadChannel = supabase
            .channel('unread-messages')
            .on<UnreadMessage>(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'unread_messages',
                    filter: `user_id=eq.${userId}`,
                },
                (payload: RealtimePostgresChangesPayload<UnreadMessage>) => {
                    const newRecord = payload.new as UnreadMessage
                    if (newRecord) {
                        // If this is for the active channel, always show 0
                        if (
                            activeChannelId &&
                            newRecord.channel_id === activeChannelId
                        ) {
                            setUnreadCount(newRecord.channel_id, 0)
                        } else {
                            setUnreadCount(
                                newRecord.channel_id,
                                newRecord.unread_count,
                            )
                        }
                    }
                },
            )
            .subscribe()

        // Also subscribe to active_channels to handle multi-tab scenarios
        const activeChannel = supabase
            .channel('active-channel')
            .on<Database['public']['Tables']['active_channels']['Row']>(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'active_channels',
                    filter: `user_id=eq.${userId}`,
                },
                payload => {
                    const record = payload.new
                    if (record && 'channel_id' in record && record.channel_id) {
                        // Clear unread count for newly activated channel
                        clearUnreadCount(record.channel_id)
                    }
                },
            )
            .subscribe()

        // Initial fetch of unread counts
        const fetchUnreadCounts = async () => {
            const [{ data: unreadMessages }, { data: activeChannel }] =
                await Promise.all([
                    // Get all unread counts
                    supabase
                        .from('unread_messages')
                        .select('channel_id, unread_count')
                        .eq('user_id', userId),
                    // Get active channel
                    supabase
                        .from('active_channels')
                        .select('channel_id')
                        .eq('user_id', userId)
                        .single(),
                ])

            if (unreadMessages) {
                unreadMessages.forEach(msg => {
                    // If this channel is active (either from URL or database), show 0
                    if (
                        (activeChannelId &&
                            msg.channel_id === activeChannelId) ||
                        (activeChannel &&
                            activeChannel.channel_id === msg.channel_id)
                    ) {
                        setUnreadCount(msg.channel_id, 0)
                    } else {
                        setUnreadCount(msg.channel_id, msg.unread_count)
                    }
                })
            }
        }

        fetchUnreadCounts()

        return () => {
            unreadChannel.unsubscribe()
            activeChannel.unsubscribe()
        }
    }, [userId, setUnreadCount, clearUnreadCount, activeChannelId])
}
