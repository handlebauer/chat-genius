'use client'

import { Button } from '@/components/ui/button'
import {
    Hash,
    ChevronDown,
    Plus,
    Lock,
    Plug,
    Copy,
    Plus as PlusIcon,
} from 'lucide-react'
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
import { useCallback, useMemo, useState, useEffect } from 'react'
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
    userId,
    isOwner,
}: {
    channel: Channel
    isActive: boolean
    isPending: boolean
    onClick: () => void
    onJoin?: () => Promise<void>
    isMember: boolean
    unreadCount: number
    userId: string
    isOwner: boolean
}) {
    const [webhookDialogOpen, setWebhookDialogOpen] = useState(false)

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
                    isMember ? (
                        <div className="relative">
                            <Hash
                                className={cn(
                                    'h-4 w-4 shrink-0',
                                    !isActive &&
                                        !isPending &&
                                        !unreadCount &&
                                        'text-zinc-500',
                                    (isActive ||
                                        isPending ||
                                        unreadCount > 0) &&
                                        'text-zinc-900',
                                )}
                            />
                            <Lock
                                className={cn(
                                    'absolute -top-[4.5px] -right-[4.5px] w-1 h-1 scale-50',
                                    !isActive &&
                                        !isPending &&
                                        !unreadCount &&
                                        'bg-zinc-100',
                                    (isActive ||
                                        isPending ||
                                        unreadCount > 0) &&
                                        'bg-zinc-200',
                                )}
                            />
                        </div>
                    ) : (
                        <Lock
                            className={cn(
                                'h-4 w-4 shrink-0',
                                'text-zinc-400 opacity-50',
                            )}
                        />
                    )
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
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                {isOwner && isMember && (
                    <Dialog
                        open={webhookDialogOpen}
                        onOpenChange={setWebhookDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="px-2 h-6 hover:bg-zinc-50/50 rounded-sm"
                                onClick={e => e.stopPropagation()}
                            >
                                <Plug className="h-4 w-4 text-zinc-500" />
                            </Button>
                        </DialogTrigger>
                        <WebhookDialog channel={channel} userId={userId} />
                    </Dialog>
                )}
                {!isMember && onJoin && (
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
                )}
            </div>
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

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                const isDisabled =
                    !name.trim() || (isPrivate && !password.trim())
                if (!isDisabled) {
                    handleCreate()
                }
            }
        },
        [handleCreate, name, isPrivate, password],
    )

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Create a new channel</DialogTitle>
                <DialogDescription>
                    Add a new channel for your team to collaborate in.
                </DialogDescription>
            </DialogHeader>
            <form
                onSubmit={e => e.preventDefault()}
                className="grid gap-4 py-4"
            >
                <div className="grid gap-2">
                    <Label htmlFor="name">Channel name</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={handleKeyDown}
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
                            onKeyDown={handleKeyDown}
                            placeholder="Enter channel password"
                            className="col-span-3"
                        />
                    </div>
                )}
            </form>
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
                            autoFocus
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

function WebhookDialog({ channel }: { channel: Channel; userId: string }) {
    const [webhooks, setWebhooks] = useState<Array<{ id: string }>>([])
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        async function loadWebhooks() {
            const { data, error } = await supabase
                .from('channel_webhooks')
                .select('*')
                .eq('channel_id', channel.id)

            if (!error && data) {
                setWebhooks(data)
            }
            setIsLoading(false)
        }

        loadWebhooks()
    }, [channel.id, supabase])

    const createWebhook = async () => {
        const { data, error } = await supabase
            .from('channel_webhooks')
            .insert([{ channel_id: channel.id }])
            .select()
            .single()

        if (!error && data) {
            setWebhooks(prev => [...prev, data])
        }
    }

    const copyWebhookUrl = async (webhookId: string) => {
        const url = `${window.location.origin}/api/webhooks/${webhookId}`
        await navigator.clipboard.writeText(url)
    }

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Manage Webhooks</DialogTitle>
                <DialogDescription>
                    Create and manage webhooks for #{channel.name}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                {isLoading ? (
                    <div className="text-sm text-zinc-500">
                        Loading webhooks...
                    </div>
                ) : (
                    <>
                        {webhooks.map(webhook => (
                            <div
                                key={webhook.id}
                                className="flex items-center gap-2"
                            >
                                <Input
                                    readOnly
                                    value={`${window.location.origin}/api/webhooks/${webhook.id}`}
                                    className="flex-1"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => copyWebhookUrl(webhook.id)}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                        <Button
                            onClick={createWebhook}
                            className="w-full"
                            variant="outline"
                        >
                            <PlusIcon className="h-4 w-4 mr-2" />
                            Create New Webhook
                        </Button>
                    </>
                )}
            </div>
        </DialogContent>
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

    const { joinChannel } = useChannelManagement(userData.id)

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
            // First sort by joined status
            const aJoined = isChannelMember(a.id)
            const bJoined = isChannelMember(b.id)
            if (aJoined !== bJoined) {
                return aJoined ? -1 : 1
            }
            // Then sort by creation date
            const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
            const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
            return bTime - aTime
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
                            const isOwner = useStore
                                .getState()
                                .channelMembers[
                                    channel.id
                                ]?.some(member => member.id === userData.id && member.role === 'owner')
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
                                    userId={userData.id}
                                    isOwner={isOwner}
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
