'use client'

import { Button } from '@/components/ui/button'
import { Hash, ChevronDown, Plus, Lock } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { useRouter, useParams } from 'next/navigation'
import { useChannelManagement } from '@/hooks/use-channel-management'
import { UserData, useStore } from '@/lib/store'
import { useCallback, useMemo, useState } from 'react'
import type { Database } from '@/lib/supabase/types'
import { createClient } from '@/lib/supabase/client'
import { useUnreadMessages } from '@/hooks/use-unread-messages'
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
                    isMember &&
                        !isActive &&
                        !isPending &&
                        !unreadCount &&
                        'text-zinc-500 font-normal',
                    (isActive || isPending) &&
                        'bg-zinc-700/10 dark:bg-zinc-700/50 text-zinc-900 font-semibold',
                    !isActive &&
                        !isPending &&
                        unreadCount > 0 &&
                        'text-zinc-900 font-semibold',
                    !isMember && 'text-zinc-400 font-normal opacity-50',
                )}
            >
                {channel.is_private ? (
                    <Lock
                        className={cn(
                            'h-4 w-4 shrink-0',
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
                ) : (
                    <Hash
                        className={cn(
                            'h-4 w-4 shrink-0',
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
                )}
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

function CreateChannelDialog() {
    const [name, setName] = useState('')
    const [isPrivate, setIsPrivate] = useState(false)
    const [password, setPassword] = useState('')
    const userData = useStore(state => state.userData)
    const { createChannel } = useChannelManagement(userData?.id || '')

    const handleCreate = useCallback(async () => {
        if (!name.trim() || !userData) return
        if (isPrivate && !password.trim()) return

        try {
            await createChannel({
                name,
                userId: userData.id,
                isPrivate,
                password: isPrivate ? password : undefined,
            })
            setName('')
            setIsPrivate(false)
            setPassword('')
        } catch (error) {
            console.error('[Client] Failed to create channel:', error)
        }
    }, [createChannel, name, isPrivate, password, userData])

    return (
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
                <div className="flex items-center space-x-2">
                    <Checkbox
                        id="private"
                        checked={isPrivate}
                        onCheckedChange={checked => {
                            setIsPrivate(checked === true)
                            if (!checked) setPassword('')
                        }}
                    />
                    <Label htmlFor="private">Make channel private</Label>
                </div>
                {isPrivate && (
                    <div className="grid gap-2">
                        <Label htmlFor="password">Channel password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Enter channel password"
                            className="col-span-3"
                        />
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button
                    onClick={handleCreate}
                    disabled={!name.trim() || (isPrivate && !password.trim())}
                >
                    Create Channel
                </Button>
            </DialogFooter>
        </DialogContent>
    )
}

function PasswordDialog({
    isOpen,
    onClose,
    onSubmit,
    channelName,
}: {
    isOpen: boolean
    onClose: () => void
    onSubmit: (password: string) => Promise<void>
    channelName: string
}) {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async () => {
        if (!password.trim()) return
        setIsSubmitting(true)
        setError('')

        try {
            await onSubmit(password)
            onClose()
        } catch (error) {
            setError('Incorrect password')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <AlertDialog open={isOpen} onOpenChange={onClose}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Enter Channel Password</AlertDialogTitle>
                    <AlertDialogDescription>
                        The channel "{channelName}" is protected. Please enter
                        the password to join.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="channel-password">Password</Label>
                        <Input
                            id="channel-password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Enter channel password"
                        />
                        {error && (
                            <p className="text-sm text-red-500">{error}</p>
                        )}
                    </div>
                </div>
                <AlertDialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!password.trim() || isSubmitting}
                    >
                        Join Channel
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export function ChannelList({ userData, channels }: ChannelListProps) {
    const { channelId } = useParams() as { channelId: string }
    const router = useRouter()
    const isChannelMember = useStore(state => state.isChannelMember)
    const unreadCounts = useStore(state => state.unreadCounts)
    const clearUnreadCount = useStore(state => state.clearUnreadCount)
    const setPendingActiveChannelId = useStore(
        state => state.setPendingActiveChannelId,
    )
    const pendingActiveChannelId = useStore(
        state => state.pendingActiveChannelId,
    )
    const [passwordDialogState, setPasswordDialogState] = useState<{
        isOpen: boolean
        channelId: string
        channelName: string
    }>({
        isOpen: false,
        channelId: '',
        channelName: '',
    })

    const { createChannel, joinChannel } = useChannelManagement(userData.id)

    // Initialize unread messages subscription
    useUnreadMessages(userData.id)

    const handleChannelClick = useCallback(
        async (channel: Channel) => {
            // If channel is private and user is not a member, show password dialog
            if (channel.is_private && !isChannelMember(channel.id)) {
                setPasswordDialogState({
                    isOpen: true,
                    channelId: channel.id,
                    channelName: channel.name,
                })
                return
            }

            // Set pending active channel immediately
            setPendingActiveChannelId(channel.id)

            // Clear unread count in local state immediately
            clearUnreadCount(channel.id)

            // Navigate to the channel
            router.push(`/chat/${channel.id}`)

            // Then clear unread count in the database
            const supabase = createClient()
            await supabase.rpc('reset_unread_count', {
                p_channel_id: channel.id,
                p_user_id: userData.id,
            })
        },
        [
            clearUnreadCount,
            setPendingActiveChannelId,
            router,
            userData.id,
            isChannelMember,
        ],
    )

    const handlePasswordSubmit = async (password: string) => {
        const { channelId } = passwordDialogState
        await joinChannel(channelId, password)

        // After successful join, navigate to the channel
        setPendingActiveChannelId(channelId)
        router.push(`/chat/${channelId}`)
    }

    // Sort channels by created_at
    const sortedChannels = useMemo(() => {
        return [...channels].sort((a, b) => {
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
            return bTime - aTime
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
                                    onClick={() => handleChannelClick(channel)}
                                    onJoin={
                                        !channel.is_private
                                            ? () => joinChannel(channel.id)
                                            : undefined
                                    }
                                    isMember={isMember}
                                    unreadCount={unreadCounts[channel.id] || 0}
                                />
                            )
                        })}
                    </div>
                </CollapsibleContent>
            </Collapsible>
            <CreateChannelDialog />
            <PasswordDialog
                isOpen={passwordDialogState.isOpen}
                onClose={() =>
                    setPasswordDialogState(prev => ({ ...prev, isOpen: false }))
                }
                onSubmit={handlePasswordSubmit}
                channelName={passwordDialogState.channelName}
            />
        </Dialog>
    )
}
