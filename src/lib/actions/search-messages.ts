'use server'

import { createClient } from '../supabase/server'
import { Message } from '../store'

interface SearchMessage extends Message {
    rank: number
    channel: {
        name: string
        type: string
    }
    created_at: string
}

interface SearchResult {
    messages: SearchMessage[]
    total: number
    hasMore: boolean
}

interface SearchParams {
    query: string
    channelId?: string
    limit?: number
    offset?: number
}

export async function searchMessages({
    query,
    channelId,
    limit = 20,
    offset = 0,
}: SearchParams): Promise<SearchResult> {
    console.log('[SearchMessages] Starting search:', {
        query,
        channelId,
        limit,
        offset,
    })
    const supabase = await createClient()

    let baseQuery = supabase
        .from('messages')
        .select(
            `
      id,
      content,
      created_at,
      channel_id,
      sender_id,
      sender:sender_id (
        id,
        name,
        avatar_url
      ),
      channel:channel_id (
        name,
        channel_type
      )
    `,
            { count: 'exact' },
        )
        .textSearch('search_vector', query.trim(), {
            type: 'websearch',
            config: 'english',
        })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    // Add channel filtering if channelId is provided
    if (channelId) {
        baseQuery = baseQuery.eq('channel_id', channelId)
    }

    // Execute the query
    const { data: messages, count, error } = await baseQuery

    if (error) {
        console.error('[SearchMessages] Search failed:', {
            error,
            query,
            channelId,
            errorMessage: error.message,
            details: error.details,
            hint: error.hint,
        })
        throw new Error(`Failed to search messages: ${error.message}`)
    }

    if (!messages || !count) {
        console.log('[SearchMessages] No results found for query:', query)
        return {
            messages: [],
            total: 0,
            hasMore: false,
        }
    }

    console.log('[SearchMessages] Search successful:', {
        query,
        resultsCount: messages.length,
        totalCount: count,
        hasMore: offset + limit < count,
    })

    // Transform the results to match our SearchMessage type
    const searchMessages = messages.map(message => ({
        id: message.id,
        content: message.content,
        created_at: message.created_at ?? '',
        channel_id: message.channel_id ?? '',
        sender:
            message.sender && message.sender.name
                ? {
                      id: message.sender.id,
                      name: message.sender.name,
                      avatar_url: message.sender.avatar_url,
                      email: '',
                      created_at: null,
                      updated_at: null,
                      status: null,
                  }
                : {
                      id: 'deleted',
                      name: 'Deleted User',
                      avatar_url: null,
                      email: '',
                      created_at: null,
                      updated_at: null,
                      status: null,
                  },
        channel: {
            name: message.channel?.name ?? '',
            type: message.channel?.channel_type ?? '',
        },
        rank: 1,
    }))

    return {
        messages: searchMessages,
        total: count,
        hasMore: offset + limit < count,
    }
}
