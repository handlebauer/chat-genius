import { useStore } from '@/lib/store'
import { useRouter, usePathname } from 'next/navigation'
import { createChannel } from '@/lib/actions/create-channel'
import { deleteChannel } from '@/lib/actions/delete-channel'
import { leaveChannel } from '@/lib/actions/leave-channel'
import { joinChannel } from '@/lib/actions/join-channel'
import { createClient } from '@/lib/supabase/client'

interface CreateChannelParams {
    name: string
    userId: string
    isPrivate?: boolean
    password?: string
}

export function useChannelManagement(userId: string) {
    const router = useRouter()
    const pathname = usePathname()
    const addChannel = useStore(state => state.addChannel)
    const removeChannel = useStore(state => state.removeChannel)
    const canDeleteChannel = useStore(state => state.canDeleteChannel)
    const isChannelMember = useStore(state => state.isChannelMember)
    const setChannelMemberships = useStore(state => state.setChannelMemberships)

    const handleCreateChannel = async (params: CreateChannelParams) => {
        try {
            const newChannel = await createChannel(params)
            addChannel(newChannel)
            router.push(`/chat/${newChannel.id}`)
        } catch (error) {
            console.error('Failed to create channel:', error)
            throw error
        }
    }

    const handleDeleteChannel = async (channelId: string) => {
        if (!canDeleteChannel(channelId, userId)) {
            throw new Error('Not authorized to delete this channel')
        }

        try {
            await deleteChannel(channelId, userId)
            removeChannel(channelId)
            router.push('/chat')
        } catch (error) {
            console.error('Failed to delete channel:', error)
            throw error
        }
    }

    const handleLeaveChannel = async (channelId: string) => {
        if (!isChannelMember(channelId)) {
            throw new Error('Not a member of this channel')
        }

        try {
            await leaveChannel(channelId, userId)
            // Only redirect if we're currently viewing the channel we're leaving
            if (pathname.includes(channelId)) {
                const firstJoinedChannel = useStore
                    .getState()
                    .channels.find(
                        c =>
                            c.id !== channelId &&
                            useStore.getState().isChannelMember(c.id),
                    )
                if (firstJoinedChannel) {
                    router.push(`/chat/${firstJoinedChannel.id}`)
                } else {
                    router.push('/chat')
                }
            }
        } catch (error) {
            console.error('Failed to leave channel:', error)
            throw error
        }
    }

    const handleJoinChannel = async (channelId: string, password?: string) => {
        if (isChannelMember(channelId)) {
            throw new Error('Already a member of this channel')
        }

        try {
            // If password is provided, verify it first
            if (password) {
                console.log('Verifying password for channel:', channelId)
                const supabase = createClient()
                const { data: isValid, error: verifyError } =
                    await supabase.rpc('verify_channel_password', {
                        p_channel_id: channelId,
                        p_password: password,
                    })

                if (verifyError || !isValid) {
                    throw new Error('Invalid password')
                }
            }

            await joinChannel(channelId, userId)
            // Update store immediately instead of waiting for real-time update
            const currentMemberships = useStore.getState().channelMemberships
            setChannelMemberships({
                ...currentMemberships,
                [channelId]: { role: 'member' },
            })
            router.push(`/chat/${channelId}`)
        } catch (error) {
            console.error('Failed to join channel:', error)
            throw error
        }
    }

    return {
        createChannel: handleCreateChannel,
        deleteChannel: handleDeleteChannel,
        leaveChannel: handleLeaveChannel,
        joinChannel: handleJoinChannel,
        canDeleteChannel: (channelId: string) =>
            canDeleteChannel(channelId, userId),
    }
}
