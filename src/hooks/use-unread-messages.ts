import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStore } from '@/lib/store'
import type { Database } from '@/lib/supabase/types'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

type UnreadMessage = Database['public']['Tables']['unread_messages']['Row']

export function useUnreadMessages(userId: string) {
    const setUnreadCount = useStore(state => state.setUnreadCount)

    useEffect(() => {
        const supabase = createClient()

        // Subscribe to changes in unread_messages table
        const channel = supabase
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
                        setUnreadCount(
                            newRecord.channel_id,
                            newRecord.unread_count,
                        )
                    }
                },
            )
            .subscribe()

        // Initial fetch of unread counts
        const fetchUnreadCounts = async () => {
            const { data: unreadMessages } = await supabase
                .from('unread_messages')
                .select('channel_id, unread_count')
                .eq('user_id', userId)

            if (unreadMessages) {
                unreadMessages.forEach(msg => {
                    setUnreadCount(msg.channel_id, msg.unread_count)
                })
            }
        }

        fetchUnreadCounts()

        return () => {
            channel.unsubscribe()
        }
    }, [userId, setUnreadCount])
}
