import { SearchResult } from './types'
import { MENTION_TEMPLATES } from '@/lib/utils/mentions'

// Utility functions for date formatting
function formatRelativeTime(date: Date): string {
    const now = new Date()
    const timeDiff = now.getTime() - date.getTime()
    const secondsDiff = Math.floor(timeDiff / 1000)
    const minutesDiff = Math.floor(secondsDiff / 60)
    const hoursDiff = Math.floor(minutesDiff / 60)
    const daysDiff = Math.floor(hoursDiff / 24)

    if (daysDiff === 0) {
        if (hoursDiff === 0) {
            if (minutesDiff === 0) {
                return 'just now'
            }
            return `${minutesDiff} minutes ago`
        }
        return `${hoursDiff} hours ago`
    } else if (daysDiff === 1) {
        return 'yesterday'
    } else if (daysDiff < 7) {
        return `${daysDiff} days ago`
    }

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined,
    })
}

// Utility functions for mention formatting
function createUserMentionSpan(userId: string, userName: string): string {
    return MENTION_TEMPLATES.USER(userId, userName)
}

function createMessageMentionSpan(
    messageId: string,
    channelId: string,
    channelName: string,
): string {
    return MENTION_TEMPLATES.MESSAGE(messageId, channelId, channelName)
}

export function formatMessageContext(msg: SearchResult): string {
    const parts: string[] = []

    // Add timestamp
    const dateInfo = formatRelativeTime(new Date(msg.created_at))
    parts.push(`[Previous Message (${dateInfo})]`)

    // Add user mention if sender info exists
    if (msg.sender_id) {
        const userName =
            msg.sender?.name ||
            msg.sender?.email?.split('@')[0] ||
            'unknown user'
        const userId = msg.sender?.id || msg.sender_id
        const userMention = createUserMentionSpan(userId, userName)
        parts.push(`COPY_THIS_EXACT_USER_MENTION:\`${userMention}\` wrote`)
    }

    // Add message mention if we have channel info
    if (msg.id && msg.channel_id) {
        const messageMention = createMessageMentionSpan(
            msg.id,
            msg.channel_id,
            msg.channel_name || 'unknown-channel',
        )
        parts.push(`(COPY_THIS_EXACT_MESSAGE_MENTION:\`${messageMention}\`)`)
    }

    // Add content and similarity
    parts.push(msg.content)
    parts.push(`(Similarity: ${(msg.similarity * 100).toFixed(1)}%)`)

    return parts.join(' ')
}
