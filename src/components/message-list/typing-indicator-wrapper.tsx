import { TypingIndicator } from '../typing-indicator'
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

    let name = 'AI Bot'
    if (isInternalAvatar) {
        name = dmParticipant?.name || `${currentChannel.name}'s Avatar`
    }

    let avatarUrl = 'https://api.dicebear.com/7.x/bottts/svg?seed=ai-bot'
    if (isInternalAvatar) {
        if (dmParticipant?.avatar_url) {
            avatarUrl = dmParticipant.avatar_url
        } else {
            avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=avatar-${dmParticipant?.id}`
        }
    }

    return <TypingIndicator name={name} avatarUrl={avatarUrl} />
}
