import { TypingIndicator } from '../typing-indicator'
import { botUserConfig } from '@/config'
import type { MessageListProps } from './types'

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
    if (!isVisible) return null

    const isInternalAvatar = dmParticipant?.email?.includes(
        '@chatgenius.internal',
    )
    const isAiBotDm = dmParticipant?.email === botUserConfig.email

    // Only show typing indicator for:
    // 1. Avatar responses (in any channel)
    // 2. AI bot responses (only in the bot's DM channel)
    if (!isInternalAvatar && !isAiBotDm) return null

    let name: string = botUserConfig.name
    let avatarUrl: string = botUserConfig.avatar_url

    if (isInternalAvatar) {
        name = dmParticipant?.name || `${currentChannel.name}'s Avatar`
        if (dmParticipant?.avatar_url) {
            avatarUrl = dmParticipant.avatar_url
        } else {
            avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=avatar-${dmParticipant?.id}`
        }
    }

    return <TypingIndicator name={name} avatarUrl={avatarUrl} />
}
