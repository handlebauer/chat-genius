'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'

export async function createThreadReply(threadId: string, content: string) {
    'use server'

    console.log('[CreateThreadReply] Starting with:', { threadId, content })
    const supabase = await createClient()

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
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser()
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
            thread_id: threadId,
        })
        .select(
            `
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
    `,
        )
        .single()

    if (messageError) {
        console.error('[CreateThreadReply] Error creating reply:', messageError)
        throw new Error(`Failed to create reply: ${messageError.message}`)
    }

    console.log('[CreateThreadReply] Successfully created reply:', message)
    revalidatePath('/chat')
    return message
}
