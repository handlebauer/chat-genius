import { stripHtml } from '@/components/search-results'
import {
    AICommandContext,
    AICommandHandler,
    AIResponse,
    SearchResult,
} from '../types'

const SYSTEM_PROMPT = `You are an AI avatar based on a specific user's communication style and expertise. You should engage with a different user in a conversation.

# CRITICAL INSTRUCTIONS - FAILURE TO FOLLOW WILL RESULT IN INCORRECT FUNCTIONALITY

## For the sake of clarity, let's call the original user the "style user" and the current user the "conversation partner".

## Context Understanding
You have been provided with two potential sets of messages:
1. STYLE_CONTEXT: Messages from "style user", whose avatar you are - use these messages to understand and mirror:
   - Their communication style and tone
   - Areas of expertise and interests
   - Professional background and role
2. USER_CONTEXT: Messages (if available) from "conversation partner" who you're talking to - use these to understand:
   - Their interests and background
   - Recent topics they've discussed
   - Their communication preferences

## Personality Guidelines
1. Mirror the "style user"'s:
   - Level of formality and tone
   - Technical expertise in relevant domains
   - Communication patterns (concise vs detailed)
2. But remember you are talking TO the current user, not the original user

## Initial Message Guidelines
1. Start with a personalized greeting that embodies the "style user"'s communication style
2. If USER_CONTEXT is available:
   - Reference your "inherited" expertise from the "style user"
   - Show some awareness of the "conversation partner"'s interests/discussions
3. If NO USER_CONTEXT is available:
   - Focus on a specific interesting topic/expertise from your STYLE_CONTEXT
   - Share an insight or perspective that reflects the "style user"'s interests
4. Keep the message concise (1-3 sentences max)

## Common Mistakes to Avoid
1. NEVER be overly formal or robotic
2. NEVER use generic greetings
3. If no user context, NEVER apologize or mention the lack of context

Style Context (style user):
\`\`\`
{styleContext}
\`\`\`

User Context (conversation partner):
\`\`\`
{userContext}
\`\`\`
`

export const avatarInitial: AICommandHandler = {
    commandId: 'avatar-initial',
    systemPrompt: SYSTEM_PROMPT,

    async handleQuestion({
        question,
        channelId,
        context,
        commandContext,
    }): Promise<AIResponse> {
        if (!channelId) {
            throw new Error('Channel ID is required for avatar-initial command')
        }

        if (!commandContext?.originalUserId) {
            throw new Error('Original user ID is required')
        }

        if (!commandContext?.currentUserId) {
            throw new Error('Current user ID is required')
        }

        // Get messages for both users
        const [originalUserMessages, currentUserMessages] = await Promise.all([
            getUserRecentMessages(commandContext.originalUserId, context),
            getUserRecentMessages(commandContext.currentUserId, context),
        ])

        const response = await generateResponse(
            question,
            originalUserMessages,
            currentUserMessages,
            commandContext.originalUserName || 'User',
            context,
            this.systemPrompt,
        )

        return {
            content: response,
            relevantMessages: [
                ...(originalUserMessages || []),
                ...(currentUserMessages || []),
            ],
        }
    },
}

async function getUserRecentMessages(
    userId: string,
    context: AICommandContext,
    limit = 50,
): Promise<SearchResult[]> {
    console.log('[GetUserRecentMessages] Fetching messages for user:', userId)

    // Get user's recent messages from public channels
    const { data: messages, error } = await context.supabase
        .from('messages')
        .select(
            `
            id,
            content,
            sender_id,
            created_at,
            channels!inner (
                id,
                name,
                is_private
            )
        `,
        )
        .eq('sender_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching user messages:', error)
        return []
    }

    if (!messages || messages.length === 0) {
        console.log('No messages found for user:', userId)
        return []
    }

    // Transform messages to match SearchResult type
    const searchResults: SearchResult[] = messages.map(
        (msg: {
            id: string
            content: string
            sender_id: string | null
            created_at: string | null
            channels: {
                id: string
                name: string
                is_private: boolean | null
            } | null
        }) => {
            if (!msg.sender_id || !msg.created_at || !msg.channels) {
                throw new Error('Invalid message data')
            }
            return {
                id: msg.id,
                content: msg.content,
                sender_id: msg.sender_id,
                channel_id: msg.channels.id,
                channel_name: msg.channels.name,
                created_at: msg.created_at,
                similarity: 1, // Not using similarity for this use case
            }
        },
    )

    return await enrichMessagesWithSenderInfo(searchResults, context)
}

async function enrichMessagesWithSenderInfo(
    messages: SearchResult[],
    context: AICommandContext,
): Promise<SearchResult[]> {
    const senderIds = [...new Set(messages.map(msg => msg.sender_id))]
    const { data: users } = await context.supabase
        .from('users')
        .select('id, name, email')
        .in('id', senderIds)

    if (!users) return messages

    const userMap = users.reduce(
        (acc: Record<string, (typeof users)[0]>, user: (typeof users)[0]) => ({
            ...acc,
            [user.id]: user,
        }),
        {} as Record<string, (typeof users)[0]>,
    )

    return messages
        .map(msg => ({
            ...msg,
            sender: {
                id: userMap[msg.sender_id].id,
                name: userMap[msg.sender_id].name || 'Unknown',
                email: userMap[msg.sender_id].email,
            },
        }))
        .map(msg => ({ ...msg, content: stripHtml(msg.content) }))
}

async function generateResponse(
    question: string,
    originalUserMessages: SearchResult[],
    currentUserMessages: SearchResult[],
    originalUserName: string,
    context: AICommandContext,
    systemPrompt: string,
): Promise<string> {
    const styleContext = originalUserMessages
        .map(msg => msg.content)
        .join('\n\n')

    let userContext = 'NO_CONTEXT_AVAILABLE'
    if (currentUserMessages.length > 0) {
        userContext = currentUserMessages.map(msg => msg.content).join('\n\n')
    }

    console.log('🔍 Style Context:', styleContext)
    console.log('🔍 User Context:', userContext)

    const response = await context.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'system',
                content: systemPrompt
                    .replace('{styleContext}', styleContext)
                    .replace('{userContext}', userContext),
            },
            {
                role: 'user',
                content: `Generate initial greeting as ${originalUserName}'s Avatar${
                    currentUserMessages.length === 0
                        ? ' (no user context available - focus on your interests)'
                        : ''
                }`,
            },
        ],
        temperature: 0.7,
        max_tokens: 500,
    })

    return (
        response.choices[0].message.content ||
        'I apologize, but I was unable to generate a response.'
    )
}
