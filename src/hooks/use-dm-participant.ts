import { useStore, type UserData } from '@/lib/store'
import { useMemo } from 'react'
import { ChannelMember } from './use-chat-data'
import { createClient } from '@/lib/supabase/client'

interface UseDMParticipantProps {
    channelId: string | null
    currentUserId: string
    currentChannelMembers?: ChannelMember[]
}

export function useDMParticipant({
    channelId,
    currentUserId,
    currentChannelMembers,
}: UseDMParticipantProps): UserData | null {
    const getDMParticipant = useStore(state => state.getDMParticipant)
    const channels = useStore(state => state.channels)
    const messages = useStore(state => state.messages)

    return useMemo(() => {
        // First try to get from store
        const storeParticipant = getDMParticipant(channelId, currentUserId)
        if (storeParticipant) return storeParticipant

        // If not in store and we have channel members data, find the other participant
        if (currentChannelMembers?.length && channelId) {
            const channel = channels.find(c => c.id === channelId)
            if (!channel || channel.channel_type !== 'direct_message')
                return null

            const otherMember = currentChannelMembers.find(
                member => member.id !== currentUserId,
            )
            if (!otherMember) return null

            // Transform ChannelMember to UserData
            return {
                id: otherMember.id,
                name: otherMember.name,
                email: otherMember.email,
                avatar_url: otherMember.avatar_url,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                status: null,
            }
        }

        // If we don't have channel members, try to get from message history
        if (channelId && messages[channelId]?.length > 0) {
            const channel = channels.find(c => c.id === channelId)
            if (!channel || channel.channel_type !== 'direct_message')
                return null

            // Find the first message from the other participant
            const otherParticipantMessage = messages[channelId].find(
                msg => msg.sender.id !== currentUserId,
            )
            if (otherParticipantMessage) {
                return {
                    id: otherParticipantMessage.sender.id,
                    name: otherParticipantMessage.sender.name,
                    email: otherParticipantMessage.sender.email,
                    avatar_url: otherParticipantMessage.sender.avatar_url,
                    created_at: otherParticipantMessage.sender.created_at,
                    updated_at: otherParticipantMessage.sender.updated_at,
                    status: null,
                }
            }
        }

        // Last resort: extract user ID from channel name and fetch user data
        if (channelId) {
            const channel = channels.find(c => c.id === channelId)
            if (!channel || channel.channel_type !== 'direct_message')
                return null

            const userIds = channel.name.slice(3).split('_')
            const otherUserId = userIds.find(id => id !== currentUserId)
            if (!otherUserId) return null

            // Create a promise to fetch user data
            // Note: We're in a useMemo, so we can't use async/await directly
            // Instead, we'll trigger the fetch and update the store when it completes
            const supabase = createClient()
            supabase
                .from('users')
                .select('*')
                .eq('id', otherUserId)
                .single()
                .then(({ data }) => {
                    if (data) {
                        // Update the store with the fetched user data
                        const userData: UserData = {
                            id: data.id,
                            name: data.name,
                            email: data.email,
                            avatar_url: data.avatar_url,
                            created_at: data.created_at,
                            updated_at: data.updated_at,
                            status: null,
                        }
                        useStore
                            .getState()
                            .setDMParticipant(channelId, userData)
                    }
                })

            // Return a loading state for now
            return null
        }

        return null
    }, [
        channelId,
        currentUserId,
        currentChannelMembers,
        getDMParticipant,
        channels,
        messages,
    ])
}
