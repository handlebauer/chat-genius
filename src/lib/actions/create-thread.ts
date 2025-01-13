'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'

export async function createThread(messageId: string, channelId: string) {
    'use server'

    console.log('[CreateThread] Starting with:', { messageId, channelId })
    const supabase = await createClient()

    // Check if thread already exists for this message
    const { data: existingThread, error: existingError } = await supabase
        .from('threads')
        .select('id')
        .eq('parent_message_id', messageId)
        .single()

    if (existingError && existingError.code !== 'PGRST116') {
        // PGRST116 is the "no rows returned" error
        console.error(
            '[CreateThread] Error checking existing thread:',
            existingError,
        )
        throw new Error(
            `Failed to check existing thread: ${existingError.message}`,
        )
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
            parent_message_id: messageId,
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
