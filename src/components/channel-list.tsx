'use client'

import { Button } from '@/components/ui/button'
import { Hash, ChevronDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
    Collapsible,
    CollapsibleTrigger,
    CollapsibleContent,
} from '@/components/ui/collapsible'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRouter, useParams } from 'next/navigation'
import { useChannelManagement } from '@/hooks/use-channel-management'
import { UserData, useStore } from '@/lib/store'
import { useCallback, useMemo, useState } from 'react'
import type { Database } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { useUnreadMessages } from '@/hooks/use-unread-messages'

type Channel = Database['public']['Tables']['channels']['Row']

function ChannelButton({
    channel,
    isActive,
    isPending,
    onClick,
    onJoin,
    isMember,
    unreadCount,
}: {
    channel: Channel
    isActive: boolean
    isPending: boolean
    onClick: () => void
    onJoin?: () => Promise<void>
    isMember: boolean
    unreadCount: number
}) {
    return (
        <div className="group relative">
            <Button
                variant="ghost"
                onClick={onClick}
                className={cn(
                    'flex items-center gap-2 justify-start w-full py-1.5 h-auto',
                    'text-sm hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50',
                    'rounded-md mx-2',
                    // Base styles - default state (Discord's muted look)
                    isMember &&
                        !isActive &&
                        !isPending &&
                        !unreadCount &&
                        'text-zinc-500 font-normal',
                    // Active or pending state (Discord's selected channel)
                    (isActive || isPending) &&
                        'bg-zinc-700/10 dark:bg-zinc-700/50 text-zinc-900 font-semibold',
                    // Unread state (Discord's unread channel)
                    !isActive &&
                        !isPending &&
                        unreadCount > 0 &&
                        'text-zinc-900 font-semibold',
                    // Not joined state
                    !isMember && 'text-zinc-400 font-normal opacity-50',
                )}
            >
                <Hash
                    className={cn(
                        'h-4 w-4 shrink-0',
                        // Hash icon follows the same state rules
                        isMember &&
                            !isActive &&
                            !isPending &&
                            !unreadCount &&
                            'text-zinc-500',
                        (isActive || isPending || unreadCount > 0) &&
                            'text-zinc-900',
                        !isMember && 'text-zinc-400 opacity-50',
                    )}
                />
                <span className="truncate">{channel.name}</span>
                {unreadCount > 0 && (
                    <div
                        className={cn(
                            'ml-auto flex items-center justify-center',
                            'min-w-[18px] h-[18px] px-1',
                            'text-xs font-semibold',
                            'bg-zinc-500 text-white',
                            'rounded-full',
                            (isActive || isPending) && 'bg-zinc-600',
                        )}
                    >
                        {unreadCount}
                    </div>
                )}
            </Button>
            {!isMember && onJoin && (
                <div className="flex items-center justify-center gap-1 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-auto">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={e => {
                            e.stopPropagation()
                            onJoin()
                        }}
                        className="px-2 h-6 hover:bg-zinc-50/50 rounded-sm text-xs text-zinc-500 hover:text-zinc-900"
                    >
                        Join
                    </Button>
                </div>
            )}
        </div>
    )
}

function ChannelListHeader() {
    return (
        <div className="flex items-center justify-between px-2 py-2">
            <CollapsibleTrigger className="flex gap-2 items-center hover:text-zinc-600">
                <ChevronDown className="w-4 h-4" />
                <h2 className="text-sm font-semibold text-zinc-500">
                    Channels
                </h2>
            </CollapsibleTrigger>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="px-2 h-6 w-6 hover:bg-zinc-200 rounded-sm"
                >
                    <Plus className="h-4 w-4 text-zinc-800 transition-colors" />
                </Button>
            </DialogTrigger>
        </div>
    )
}

interface ChannelListProps {
    userData: UserData
    channels: Channel[]
}

export function ChannelList({ userData, channels }: ChannelListProps) {
    const { channelId } = useParams() as { channelId: string }
    const router = useRouter()
    const [name, setName] = useState('')
    const isChannelMember = useStore(state => state.isChannelMember)
    const unreadCounts = useStore(state => state.unreadCounts)
    const clearUnreadCount = useStore(state => state.clearUnreadCount)
    const setPendingActiveChannelId = useStore(
        state => state.setPendingActiveChannelId,
    )
    const pendingActiveChannelId = useStore(
        state => state.pendingActiveChannelId,
    )

    const { createChannel, joinChannel } = useChannelManagement(userData.id)

    // Initialize unread messages subscription
    useUnreadMessages(userData.id)

    const handleChannelClick = useCallback(
        async (channelId: string) => {
            // Set pending active channel immediately
            setPendingActiveChannelId(channelId)

            // Clear unread count in local state immediately
            clearUnreadCount(channelId)

            // Navigate to the channel
            router.push(`/chat/${channelId}`)

            // Then clear unread count in the database
            const supabase = createClient()
            await supabase.rpc('reset_unread_count', {
                p_channel_id: channelId,
                p_user_id: userData.id,
            })
        },
        [clearUnreadCount, setPendingActiveChannelId, router, userData.id],
    )

    if (!userData) {
        return (
            <div className="px-2">
                <div className="flex items-center px-2 py-2">
                    <h2 className="text-sm font-semibold text-zinc-500">
                        Loading channels...
                    </h2>
                </div>
            </div>
        )
    }

    const handleCreate = useCallback(async () => {
        if (!name.trim()) return
        try {
            await createChannel(name)
            setName('')
        } catch (error) {
            console.error('[Client] Failed to create channel:', error)
        }
    }, [createChannel, name, setName])

    // Sort channels by created_at
    const sortedChannels = useMemo(() => {
        return [...channels].sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
            return bTime - aTime // Sort in descending order (newest first)
        })
    }, [channels])

    return (
        <Dialog>
            <Collapsible defaultOpen className="px-2">
                <ChannelListHeader />
                <CollapsibleContent>
                    <div className="px-2 flex flex-col gap-1">
                        {sortedChannels.map(channel => {
                            const isMember = isChannelMember(channel.id)
                            return (
                                <ChannelButton
                                    key={channel.id}
                                    channel={channel}
                                    isActive={channelId === channel.id}
                                    isPending={
                                        pendingActiveChannelId === channel.id
                                    }
                                    onClick={() =>
                                        handleChannelClick(channel.id)
                                    }
                                    onJoin={() => joinChannel(channel.id)}
                                    isMember={isMember}
                                    unreadCount={unreadCounts[channel.id] || 0}
                                />
                            )
                        })}
                    </div>
                </CollapsibleContent>
            </Collapsible>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create a new channel</DialogTitle>
                    <DialogDescription>
                        Add a new channel for your team to collaborate in.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Channel name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. marketing"
                            className="col-span-3"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCreate} disabled={!name.trim()}>
                        Create Channel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
