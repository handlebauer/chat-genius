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

type Channel = Database['public']['Tables']['channels']['Row']

function ChannelButton({
    channel,
    isActive,
    onClick,
    onJoin,
    isMember,
}: {
    channel: Channel
    isActive: boolean
    onClick: () => void
    onJoin?: () => Promise<void>
    isMember: boolean
}) {
    return (
        <div className="group relative">
            <Button
                variant="ghost"
                onClick={onClick}
                className={cn(
                    'flex items-center gap-2 justify-start w-full py-1 h-auto transition-colors',
                    // Base styles for joined/unjoined
                    isMember && 'font-semibold text-zinc-900',
                    !isMember && 'text-zinc-400',
                    // Background styles based on state
                    isActive && 'bg-zinc-200 hover:bg-zinc-200',
                    !isActive && isMember && 'bg-white/50 hover:bg-zinc-100',
                    !isActive &&
                        !isMember &&
                        'bg-zinc-50/30 hover:bg-zinc-100/50',
                )}
            >
                <Hash
                    className={cn(
                        'h-4 w-4 shrink-0',
                        isMember && 'text-zinc-900',
                        !isMember && 'text-zinc-400',
                    )}
                />
                <span className="truncate">{channel.name}</span>
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

    const { createChannel, joinChannel } = useChannelManagement(userData.id)

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

    // Sort channels: joined channels first, then alphabetically within each group
    const sortedChannels = useMemo(() => {
        return [...channels].sort((a, b) => {
            const aMember = isChannelMember(a.id)
            const bMember = isChannelMember(b.id)
            if (aMember && !bMember) return -1
            if (!aMember && bMember) return 1
            return a.name.localeCompare(b.name)
        })
    }, [channels, isChannelMember])

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
                                    onClick={() =>
                                        router.push(`/chat/${channel.id}`)
                                    }
                                    onJoin={() => joinChannel(channel.id)}
                                    isMember={isMember}
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
