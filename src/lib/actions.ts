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
  channel: {
    name: string;
    type: string;
  };
}

type DatabaseMessageWithRank = Database['public']['Tables']['messages']['Row'] & {
  sender: Pick<Database['public']['Tables']['users']['Row'], 'id' | 'name' | 'avatar_url'> | null;
  channel: Pick<Database['public']['Tables']['channels']['Row'], 'name' | 'channel_type'>;
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
      sender:sender_id (
        id,
        name,
        avatar_url
      ),
      channel:channel_id (
        name,
        channel_type
      )
    `, { count: 'exact' })
    .textSearch('search_vector', query.trim(), {
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
    channel: {
      name: message.channel.name,
      type: message.channel.channel_type
    },
    rank: 1
  }));

  return {
    messages: searchMessages,
    total: count,
    hasMore: offset + limit < count
  };
}

export async function createChannel(name: string, userId: string) {
  'use server'

  console.log('[CreateChannel] Starting with:', { name, userId })
  const supabase = createServerActionClient<Database>({ cookies })

  // Check if channel already exists
  const { data: existingChannel, error: existingError } = await supabase
    .from('channels')
    .select('id')
    .eq('name', name.toLowerCase())
    .single()

  if (existingError && existingError.code !== 'PGRST116') {
    console.error('[CreateChannel] Error checking existing channel:', existingError)
    throw new Error(`Failed to check existing channel: ${existingError.message}`)
  }

  if (existingChannel) {
    console.log('[CreateChannel] Channel already exists:', existingChannel)
    throw new Error('Channel already exists')
  }

  // Create new channel
  const { data: newChannel, error: createError } = await supabase
    .from('channels')
    .insert({
      name: name.toLowerCase(),
      channel_type: 'channel',
      is_private: false,
      created_by: userId
    })
    .select()
    .single()

  if (createError) {
    console.error('[CreateChannel] Error creating channel:', createError)
    throw new Error(`Failed to create channel: ${createError.message}`)
  }

  console.log('[CreateChannel] Successfully created channel:', newChannel)
  revalidatePath('/chat')
  return newChannel
}

export async function deleteChannel(channelId: string, userId: string) {
  'use server'

  const supabase = createServerActionClient<Database>({ cookies })

  // Check if user is the channel creator
  const { data: channel } = await supabase
    .from('channels')
    .select('created_by')
    .eq('id', channelId)
    .single()

  if (!channel || channel.created_by !== userId) {
    throw new Error('Not authorized to delete this channel')
  }

  const { error: deleteError } = await supabase
    .from('channels')
    .delete()
    .eq('id', channelId)

  if (deleteError) {
    throw new Error('Failed to delete channel')
  }

  revalidatePath('/chat')
}

export async function createThread(messageId: string, channelId: string) {
  'use server'

  console.log('[CreateThread] Starting with:', { messageId, channelId })
  const supabase = createServerActionClient<Database>({ cookies })

  // Check if thread already exists for this message
  const { data: existingThread, error: existingError } = await supabase
    .from('threads')
    .select('id')
    .eq('parent_message_id', messageId)
    .single()

  if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is the "no rows returned" error
    console.error('[CreateThread] Error checking existing thread:', existingError)
    throw new Error(`Failed to check existing thread: ${existingError.message}`)
  }

  if (existingThread) {
    console.log('[CreateThread] Thread already exists:', existingThread)
    return existingThread
  }

  // Create new thread
  const { data: newThread, error: createError } = await supabase
    .from('threads')
    .insert({
      channel_id: channelId,
      parent_message_id: messageId
    })
    .select()
    .single()

  if (createError) {
    console.error('[CreateThread] Error creating thread:', createError)
    throw new Error(`Failed to create thread: ${createError.message}`)
  }

  console.log('[CreateThread] Successfully created thread:', newThread)
  revalidatePath('/chat')
  return newThread
}

export async function createThreadReply(threadId: string, content: string) {
  'use server'

  console.log('[CreateThreadReply] Starting with:', { threadId, content })
  const supabase = createServerActionClient<Database>({ cookies })

  if (!content.trim()) {
    throw new Error('Reply content cannot be empty')
  }

  // First, get the thread to ensure it exists and get its channel_id
  const { data: thread, error: threadError } = await supabase
    .from('threads')
    .select('channel_id')
    .eq('id', threadId)
    .single()

  if (threadError) {
    console.error('[CreateThreadReply] Error fetching thread:', threadError)
    throw new Error(`Thread not found: ${threadError.message}`)
  }

  // Get the current user's ID
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    console.error('[CreateThreadReply] Error getting user:', userError)
    throw new Error('Not authenticated')
  }

  // Create the reply message
  const { data: message, error: messageError } = await supabase
    .from('messages')
    .insert({
      content: content.trim(),
      channel_id: thread.channel_id,
      sender_id: user.id,
      thread_id: threadId
    })
    .select(`
      id,
      content,
      created_at,
      channel_id,
      sender:users!messages_sender_id_fkey(
        id,
        name,
        email,
        avatar_url,
        status,
        created_at,
        updated_at
      )
    `)
    .single()

  if (messageError) {
    console.error('[CreateThreadReply] Error creating reply:', messageError)
    throw new Error(`Failed to create reply: ${messageError.message}`)
  }

  console.log('[CreateThreadReply] Successfully created reply:', message)
  revalidatePath('/chat')
  return message
}

export async function toggleReaction(messageId: string, emoji: string) {
  const start = Date.now()
  const supabase = createServerActionClient<Database>({ cookies })

  try {
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    // Check if the user has already reacted with this emoji
    const { data: existingReaction } = await supabase
      .from('reactions')
      .select()
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .single()

    let result
    if (existingReaction) {
      // Remove the reaction
      console.log(`[Action] Removing reaction: ${emoji}`)
      result = await supabase
        .from('reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji)
    } else {
      // Add the reaction
      console.log(`[Action] Adding reaction: ${emoji}`)
      result = await supabase
        .from('reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji: emoji
        })
    }

    if (result.error) throw result.error

    // Revalidate the messages path to update the UI
    revalidatePath('/channels/[channelId]', 'page')

    console.log(`[Action] toggleReaction success: ${Date.now() - start}ms`)
    return { success: true }
  } catch (error) {
    console.error(`[Action] toggleReaction error: ${Date.now() - start}ms`, error)
    return { success: false, error }
  }
}
