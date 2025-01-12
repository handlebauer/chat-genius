'use client'

import { Button } from '@/components/ui/button'
import { Hash, ChevronDown, Plus, Trash2 } from 'lucide-react'
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useChannels } from '@/hooks/use-channels'
import { useRouter, useParams } from 'next/navigation'
import { useChannelManagement } from '@/hooks/use-channel-management'
import { useStore } from '@/lib/store'
import { useState } from 'react'
import type { Database } from '@/lib/supabase/types'

type Channel = Database['public']['Tables']['channels']['Row']

function DeleteChannelDialog({
    channel,
    onDelete,
}: {
    channel: Channel
    onDelete: () => Promise<void>
}) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="px-2 h-6 w-6 hover:bg-zinc-50/50 rounded-sm"
                >
                    <Trash2 className="h-4 w-4 text-zinc-600 hover:text-zinc-400 transition-colors" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Channel</AlertDialogTitle>
                    <AlertDialogDescription>
                        Are you sure you want to delete #{channel.name}? This
                        action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onDelete}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

function ChannelButton({
    channel,
    isActive,
    onClick,
    onDelete,
    showDelete,
}: {
    channel: Channel
    isActive: boolean
    onClick: () => void
    onDelete?: () => Promise<void>
    showDelete?: boolean
}) {
    return (
        <div className="group relative">
            <Button
                variant="ghost"
                onClick={onClick}
                className={cn(
                    'flex items-center gap-2 justify-start w-full hover:bg-zinc-200 group-hover:bg-zinc-200 py-1 h-auto',
                    isActive && 'bg-zinc-200',
                )}
            >
                <Hash className="h-4 w-4 shrink-0" />
                <span className="truncate">{channel.name}</span>
            </Button>
            {showDelete && onDelete && (
                <div className="opacity-0 flex items-center justify-center group-hover:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2 pointer-events-auto">
                    <DeleteChannelDialog
                        channel={channel}
                        onDelete={onDelete}
                    />
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

export function ChannelList() {
    const { channelId } = useParams() as { channelId: string }
    const router = useRouter()

    const { channels } = useChannels()
    const userData = useStore(state => state.userData)

    const { deleteChannel, canDeleteChannel, createChannel } =
        useChannelManagement(userData?.id || '')

    const [name, setName] = useState('')

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

    const regularChannels = channels.filter(
        channel => channel.channel_type === 'channel',
    )

    const handleDeleteChannel = async (channel: Channel) => {
        try {
            await deleteChannel(channel.id)
        } catch (error) {
            console.error('[Client] Failed to delete channel:', error)
        }
    }

    const handleCreate = async () => {
        if (!name.trim()) return
        try {
            await createChannel(name)
            setName('')
        } catch (error) {
            console.error('[Client] Failed to create channel:', error)
        }
    }

    return (
        <Dialog>
            <Collapsible defaultOpen className="px-2">
                <ChannelListHeader />
                <CollapsibleContent>
                    <div className="px-2 flex flex-col gap-1">
                        {regularChannels.map(channel => (
                            <ChannelButton
                                key={channel.id}
                                channel={channel}
                                isActive={channelId === channel.id}
                                onClick={() =>
                                    router.push(`/chat/${channel.id}`)
                                }
                                onDelete={() => handleDeleteChannel(channel)}
                                showDelete={canDeleteChannel(channel.id)}
                            />
                        ))}
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
