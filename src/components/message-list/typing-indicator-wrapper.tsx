import { TypingIndicator } from '../typing-indicator'
import { botUserConfig } from '@/config'
import type { MessageListProps } from './types'
import { useState, useEffect } from 'react'
import { isInternalAvatar, isBotUser } from '@/lib/utils'

interface TypingIndicatorWrapperProps {
    isVisible: boolean
    dmParticipant?: MessageListProps['dmParticipant']
    currentChannel: MessageListProps['currentChannel']
}

export function TypingIndicatorWrapper({
    isVisible,
    dmParticipant,
    currentChannel,
}: TypingIndicatorWrapperProps) {
    const [showIndicator, setShowIndicator] = useState(false)

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>

        if (isVisible) {
            // Add a 750ms delay before showing the typing indicator
            timeoutId = setTimeout(() => {
                setShowIndicator(true)
            }, 750)
        } else {
            setShowIndicator(false)
        }

        return () => {
            if (timeoutId) {
                clearTimeout(timeoutId)
            }
        }
    }, [isVisible])

    if (!showIndicator) return null

    const isInternalAvatarUser = isInternalAvatar(dmParticipant?.email)
    const isAiBotDm = isBotUser(dmParticipant?.email)

    // Only show typing indicator for:
    // 1. Avatar responses (in any channel)
    // 2. AI bot responses (only in the bot's DM channel)
    if (!isInternalAvatarUser && !isAiBotDm) return null

    let name: string = botUserConfig.name
    let avatarUrl: string = botUserConfig.avatar_url

    if (isInternalAvatarUser) {
        name = dmParticipant?.name || `${currentChannel.name}'s Avatar`
        if (dmParticipant?.avatar_url) {
            avatarUrl = dmParticipant.avatar_url
        } else {
            avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=avatar-${dmParticipant?.id}`
        }
    }

    return <TypingIndicator name={name} avatarUrl={avatarUrl} />
}
