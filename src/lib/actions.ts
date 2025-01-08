'use server'

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Database } from './supabase/types'
import { revalidatePath } from 'next/cache'

export async function signOutAction() {
  const supabase = createServerActionClient({ cookies })
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getOrCreateDMChannel(currentUserId: string, otherUserId: string) {
  'use server'

  const supabase = createServerActionClient<Database>({ cookies })

  // Generate a deterministic channel name for the DM
  const participantIds = [currentUserId, otherUserId].sort()
  const channelName = `dm:${participantIds.join('_')}`

  // Check if the DM channel already exists
  const { data: existingChannel, error: fetchError } = await supabase
    .from('channels')
    .select('*')
    .eq('name', channelName)
    .eq('channel_type', 'direct_message')
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is the "no rows returned" error
    throw new Error('Failed to fetch DM channel')
  }

  if (existingChannel) {
    return existingChannel
  }

  // Create new DM channel if it doesn't exist
  const { data: newChannel, error: createError } = await supabase
    .from('channels')
    .insert({
      name: channelName,
      channel_type: 'direct_message',
      is_private: true,
      created_by: currentUserId
    })
    .select()
    .single()

  if (createError) {
    throw new Error('Failed to create DM channel')
  }

  revalidatePath('/chat')
  return newChannel
}

interface Message {
  id: string;
  content: string;
  created_at: string;
  channel_id: string;
  sender: {
    id: string;
    name: string;
    avatar_url?: string | null;
  };
}

interface SearchMessage extends Message {
  rank: number;
}

type DatabaseMessageWithRank = Database['public']['Tables']['messages']['Row'] & {
  sender: Pick<Database['public']['Tables']['users']['Row'], 'id' | 'name' | 'avatar_url'> | null;
  rank: number;
};

interface SearchResult {
  messages: SearchMessage[];
  total: number;
  hasMore: boolean;
}

interface SearchParams {
  query: string;
  channelId?: string;
  limit?: number;
  offset?: number;
}

export async function searchMessages({
  query,
  channelId,
  limit = 20,
  offset = 0
}: SearchParams): Promise<SearchResult> {
  console.log('[SearchMessages] Starting search:', { query, channelId, limit, offset });
  const supabase = createServerActionClient<Database>({ cookies });

  let baseQuery = supabase
    .from('messages')
    .select(`
      id,
      content,
      created_at,
      channel_id,
      sender_id,
      sender_name,
      sender:sender_id (
        id,
        name,
        avatar_url
      )
    `, { count: 'exact' })
    .textSearch('search_vector', query, {
      type: 'websearch',
      config: 'english'
    })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Add channel filtering if channelId is provided
  if (channelId) {
    baseQuery = baseQuery.eq('channel_id', channelId);
  }

  // Execute the query
  const { data: messages, count, error } = await baseQuery;

  if (error) {
    console.error('[SearchMessages] Search failed:', {
      error,
      query,
      channelId,
      errorMessage: error.message,
      details: error.details,
      hint: error.hint
    });
    throw new Error(`Failed to search messages: ${error.message}`);
  }

  if (!messages || !count) {
    console.log('[SearchMessages] No results found for query:', query);
    return {
      messages: [],
      total: 0,
      hasMore: false
    };
  }

  console.log('[SearchMessages] Search successful:', {
    query,
    resultsCount: messages.length,
    totalCount: count,
    hasMore: offset + limit < count
  });

  // Transform the results to match our SearchMessage type
  const searchMessages = (messages as unknown as DatabaseMessageWithRank[]).map(message => ({
    id: message.id,
    content: message.content,
    created_at: message.created_at,
    channel_id: message.channel_id,
    sender: message.sender && message.sender.name ? {
      id: message.sender.id,
      name: message.sender.name,
      avatar_url: message.sender.avatar_url
    } : {
      id: 'deleted',
      name: 'Deleted User'
    },
    rank: 1 // Since we can't get the rank directly, we'll just use 1 for now
  }));

  return {
    messages: searchMessages,
    total: count,
    hasMore: offset + limit < count
  };
}
