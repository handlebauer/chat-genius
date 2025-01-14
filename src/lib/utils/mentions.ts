import type { Database } from '@/lib/supabase/types'

type User = Database['public']['Tables']['users']['Row']

export function parseMentions(content: string): string[] {
    // Extract all user IDs from mention spans
    const mentionRegex =
        /<span class="mention" data-user-id="([^"]+)">[^<]+<\/span>/g
    const mentions: string[] = []
    let match

    while ((match = mentionRegex.exec(content)) !== null) {
        mentions.push(match[1])
    }

    return mentions
}

export function formatMentionText(
    content: string,
    users: Record<string, User>,
): string {
    // Replace mention spans with highlighted text while preserving all mention attributes
    return content.replace(
        /<span class="mention" data-user-id="([^"]+)">@([^<]+)<\/span>/g,
        (_, userId) => {
            const user = users[userId]
            if (!user) return `@unknown-user`
            const displayName = user.name || user.email.split('@')[0]
            // Keep all mention attributes and add mention-text class
            return `<span class="mention mention-text" data-user-id="${userId}" data-name="${displayName}">@${displayName}</span>`
        },
    )
}

export function extractPlainText(content: string): string {
    // Convert HTML content to plain text, preserving mentions as @username
    return content
        .replace(
            /<span class="mention" data-user-id="[^"]+">@([^<]+)<\/span>/g,
            '@$1',
        )
        .replace(/<[^>]+>/g, '') // Remove any other HTML tags
}
