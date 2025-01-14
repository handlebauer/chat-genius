import type { Database } from '@/lib/supabase/types'

// Constants for mention templates
export const MENTION_TEMPLATES = {
    USER: (userId: string, userName: string) =>
        `<span class="mention mention-text" data-user-id="${userId}" data-name="${userName}">@${userName}</span>`,

    MESSAGE: (messageId: string, channelId: string, channelName: string) =>
        `<span class="message-mention message-mention-text" data-message-id="${messageId}" data-channel-id="${channelId}">#${channelName}&nbsp;<svg class="message-mention-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg></span>`,
} as const

type User = Database['public']['Tables']['users']['Row']
type Channel = Database['public']['Tables']['channels']['Row']

// Common regex patterns
const PATTERNS = {
    USER_MENTION: /<span class="mention" data-user-id="([^"]+)">[^<]+<\/span>/g,
    MESSAGE_MENTION:
        /<span class="message-mention" data-message-id="([^"]+)">[^<]+<\/span>/g,
} as const

/**
 * Extract all mention IDs from content
 */
export function parseMentions(content: string): {
    userIds: string[]
    messageIds: string[]
} {
    return {
        userIds: Array.from(content.matchAll(PATTERNS.USER_MENTION), m => m[1]),
        messageIds: Array.from(
            content.matchAll(PATTERNS.MESSAGE_MENTION),
            m => m[1],
        ),
    }
}

/**
 * Format content with user and message mentions
 */
export function formatMentionText(
    content: string,
    users: Record<string, User>,
    messages?: Record<string, { id: string; channelId: string }>,
    channels?: Record<string, Channel>,
): string {
    // Format user mentions
    content = content.replace(PATTERNS.USER_MENTION, (_, userId) => {
        const user = users[userId]
        if (!user) return '@unknown-user'
        const name = user.name || user.email.split('@')[0]
        return MENTION_TEMPLATES.USER(userId, name)
    })

    // Format message mentions if messages are provided
    if (messages && channels) {
        content = content.replace(PATTERNS.MESSAGE_MENTION, (_, messageId) => {
            const message = messages[messageId]
            if (!message) return '#deleted-message'
            const channel = channels[message.channelId]
            const channelName = channel?.name || 'unknown-channel'
            return MENTION_TEMPLATES.MESSAGE(
                messageId,
                message.channelId,
                channelName,
            )
        })
    }

    return content
}

/**
 * Convert HTML content to plain text while preserving mention syntax
 */
export function extractPlainText(content: string): string {
    return content
        .replace(PATTERNS.USER_MENTION, '@$1')
        .replace(PATTERNS.MESSAGE_MENTION, '#$1')
        .replace(/<[^>]+>/g, '') // Remove any remaining HTML tags
}

/**
 * Create mention HTML for a message reference
 */
export function createMessageMention(
    messageId: string,
    channelId: string,
    channelName: string,
): string {
    return MENTION_TEMPLATES.MESSAGE(messageId, channelId, channelName)
}

/**
 * Extract all unique mentioned user IDs from a list of messages
 */
export function getMentionedUserIds(messages: { content: string }[]): string[] {
    const userIds = new Set<string>()
    messages.forEach(msg => {
        parseMentions(msg.content).userIds.forEach(id => userIds.add(id))
    })
    return Array.from(userIds)
}

/**
 * Extract all unique referenced message IDs from a list of messages
 */
export function getReferencedMessageIds(
    messages: { content: string }[],
): string[] {
    const messageIds = new Set<string>()
    messages.forEach(msg => {
        parseMentions(msg.content).messageIds.forEach(id => messageIds.add(id))
    })
    return Array.from(messageIds)
}
