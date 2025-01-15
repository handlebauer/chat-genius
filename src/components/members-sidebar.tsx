'use client'

import { memo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useDebugRender } from '@/hooks/use-debug-render'
import { ChannelMember } from '@/hooks/use-chat-data'
import { MemberItem } from './member-item'
import { useMembersPresence } from '@/hooks/use-members-presence'
import { Users } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useShallow } from 'zustand/react/shallow'

interface MembersSidebarProps {
    members: ChannelMember[]
    userId: string
    systemUserId: string
}

export const MembersSidebar = memo(function MembersSidebar({
    members,
    userId,
    systemUserId,
}: MembersSidebarProps) {
    useDebugRender('MembersSidebar', {
        'members.length': members.length,
        userId,
        systemUserId,
    })

    // Use shallow comparison for channels to prevent unnecessary re-renders
    const channels = useStore(useShallow(state => state.channels))

    const { members: sortedMembers, getStatusColor } = useMembersPresence(
        members,
        userId,
        systemUserId,
    )

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
