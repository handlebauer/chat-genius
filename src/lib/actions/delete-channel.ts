'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteChannel(channelId: string, userId: string) {
    'use server'

    const supabase = await createClient()

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
