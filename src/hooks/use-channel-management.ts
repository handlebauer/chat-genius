import { useStore } from '@/lib/store'
import { createChannel, deleteChannel } from '@/lib/actions'
import { useRouter } from 'next/navigation'

export function useChannelManagement(userId: string) {
    const router = useRouter()
    const { addChannel, removeChannel, canDeleteChannel } = useStore()

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

    return {
        createChannel: handleCreateChannel,
        deleteChannel: handleDeleteChannel,
        canDeleteChannel: (channelId: string) =>
            canDeleteChannel(channelId, userId),
    }
}
