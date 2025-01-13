import { useStore } from '@/lib/store'
import { useRouter, usePathname } from 'next/navigation'
import { createChannel } from '@/lib/actions/create-channel'
import { deleteChannel } from '@/lib/actions/delete-channel'
import { leaveChannel } from '@/lib/actions/leave-channel'
import { joinChannel } from '@/lib/actions/join-channel'

export function useChannelManagement(userId: string) {
    const router = useRouter()
    const pathname = usePathname()
    const addChannel = useStore(state => state.addChannel)
    const removeChannel = useStore(state => state.removeChannel)
    const canDeleteChannel = useStore(state => state.canDeleteChannel)
    const isChannelMember = useStore(state => state.isChannelMember)
    const activeChannelId = useStore(state => state.activeChannelId)

    const handleCreateChannel = async (name: string) => {
        try {
            const newChannel = await createChannel(name, userId)
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

    const handleJoinChannel = async (channelId: string) => {
        if (isChannelMember(channelId)) {
            throw new Error('Already a member of this channel')
        }

        try {
            await joinChannel(channelId, userId)
            // No need to update store as the real-time subscription will handle it
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
