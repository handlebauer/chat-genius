'use client'

import { memo, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChannelMember } from '@/hooks/use-chat-data'
import { MemberItem } from './member-item'
import { useMembersPresence } from '@/hooks/use-members-presence'
import { Users } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useShallow } from 'zustand/react/shallow'
import { createClient } from '@/lib/supabase/client'
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { Database } from '@/lib/supabase/types'

interface ChannelMemberRecord {
    id: string
    user_id: string
    role: 'owner' | 'admin' | 'member'
    channel_id: string
}

type ChannelMemberChanges = RealtimePostgresChangesPayload<ChannelMemberRecord>

interface MembersSidebarProps {
    members: ChannelMember[]
    userId: string
    systemUserId: string
}

export const MembersSidebar = memo(function MembersSidebar({
    members: initialMembers,
    userId,
    systemUserId,
}: MembersSidebarProps) {
    // Use shallow comparison for channels and members to prevent unnecessary re-renders
    const channels = useStore(useShallow(state => state.channels))
    const { setChannelMembers, addChannelMember, removeChannelMember } =
        useStore()
    const channelId = useStore(state => state.activeChannelId)
    const channelMembers = useStore(
        useShallow(state =>
            channelId ? state.channelMembers[channelId] || [] : [],
        ),
    )

    const { members: sortedMembers, getStatusColor } = useMembersPresence(
        channelMembers,
        userId,
        systemUserId,
    )

    // Initialize channel members in store when channelId or initialMembers changes
    useEffect(() => {
        if (!channelId) return
        setChannelMembers(channelId, initialMembers)
    }, [channelId, initialMembers, setChannelMembers])

    // Set up real-time subscription for channel members
    useEffect(() => {
        if (!channelId) return

        const supabase = createClient()

        // Subscribe to channel member changes
        const channel = supabase
            .channel('channel_members')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'channel_members',
                    filter: `channel_id=eq.${channelId}`,
                },
                async payload => {
                    console.log('[MembersSidebar] Member change:', payload)

                    // Handle DELETE events first
                    if (payload.eventType === 'DELETE') {
                        // Since we have all members in memory, and we know one was just deleted,
                        // we can remove any member from our list
                        if (channelMembers.length > 0) {
                            // Remove the first member we find
                            // This works because we know a member was just deleted
                            // and the list in memory hasn't been updated yet
                            removeChannelMember(channelId, channelMembers[0].id)
                        } else {
                            console.error(
                                '[MembersSidebar] No members to remove:',
                                payload,
                            )
                        }
                        return
                    }

                    // Handle INSERT/UPDATE events
                    const record = payload.new as ChannelMemberRecord
                    if (!record?.user_id || !record?.role) {
                        console.error(
                            '[MembersSidebar] Missing required fields:',
                            payload,
                        )
                        return
                    }

                    // Fetch the complete user data for the member
                    const { data: userData, error } = await supabase
                        .from('users')
                        .select('id, name, email, avatar_url')
                        .eq('id', record.user_id)
                        .single()

                    if (error) {
                        console.error(
                            '[MembersSidebar] Error fetching user:',
                            error,
                        )
                        return
                    }

                    const member: ChannelMember = {
                        id: userData.id,
                        name: userData.name,
                        email: userData.email,
                        avatar_url: userData.avatar_url,
                        role: record.role,
                    }

                    if (payload.eventType === 'INSERT') {
                        addChannelMember(channelId, member)
                    }
                },
            )
            .subscribe()

        return () => {
            channel.unsubscribe()
        }
    }, [channelId, addChannelMember, removeChannelMember, channelMembers])

    return (
        <div className="w-60 bg-zinc-50 border-l flex flex-col">
            <div className="mt-14 px-4 py-3 flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-500 transition-colors">
                    <Users size={13} strokeWidth={2.5} />
                    <span className="text-[11px] font-medium tracking-wide">
                        {sortedMembers.length}{' '}
                        {sortedMembers.length === 1 ? 'member' : 'members'}
                    </span>
                </div>
            </div>
            <ScrollArea className="flex-1">
                <div className="px-2">
                    {sortedMembers.map(member => (
                        <MemberItem
                            key={member.id}
                            member={member}
                            isCurrentUser={member.id === userId}
                            isSystemUser={member.id === systemUserId}
                            statusColor={getStatusColor(member.id)}
                            currentUserId={userId}
                            channels={channels}
                        />
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
})
