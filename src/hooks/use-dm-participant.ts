import { useStore, type UserData } from '@/lib/store'
import { useMemo, useEffect, useRef } from 'react'
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
    const lastKnownValue = useRef<UserData | null>(null)

    // First try to get from store
    const storeParticipant = getDMParticipant(channelId, currentUserId)

    if (storeParticipant) {
        lastKnownValue.current = storeParticipant
        return storeParticipant
    }

    // If not in store and we have channel members data, find the other participant
    if (currentChannelMembers?.length && channelId) {
        const channel = channels.find(c => c.id === channelId)
        if (!channel || channel.channel_type !== 'direct_message')
            return lastKnownValue.current

        const otherMember = currentChannelMembers.find(
            member => member.id !== currentUserId,
        )
        if (!otherMember) return lastKnownValue.current

        // Transform ChannelMember to UserData
        const userData = {
            id: otherMember.id,
            name: otherMember.name,
            email: otherMember.email,
            avatar_url: otherMember.avatar_url,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            status: null,
        }
        lastKnownValue.current = userData
        return userData
    }

    // If we don't have channel members, try to get from message history
    if (channelId && messages[channelId]?.length > 0) {
        const channel = channels.find(c => c.id === channelId)
        if (!channel || channel.channel_type !== 'direct_message')
            return lastKnownValue.current

        // Find the first message from the other participant
        const otherParticipantMessage = messages[channelId].find(
            msg => msg.sender.id !== currentUserId,
        )
        if (otherParticipantMessage) {
            const userData = {
                id: otherParticipantMessage.sender.id,
                name: otherParticipantMessage.sender.name,
                email: otherParticipantMessage.sender.email,
                avatar_url: otherParticipantMessage.sender.avatar_url,
                created_at: otherParticipantMessage.sender.created_at,
                updated_at: otherParticipantMessage.sender.updated_at,
                status: null,
            }
            lastKnownValue.current = userData
            return userData
        }
    }

    return lastKnownValue.current
}
