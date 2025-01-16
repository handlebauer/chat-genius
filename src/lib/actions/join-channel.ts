'use server'

import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'

export async function joinChannel(channelId: string, userId: string) {
    console.log('[JoinChannel] Starting with:', { channelId, userId })
    const supabase = await createClient()

    // Check if channel exists and get its type
    const { data: channel, error: channelError } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single()

    if (channelError) {
        console.error('[JoinChannel] Error fetching channel:', channelError)
        throw new Error(`Failed to fetch channel: ${channelError.message}`)
    }

    // Check if user is already a member
    const { data: existingMember, error: memberError } = await supabase
        .from('channel_members')
        .select('*')
        .eq('channel_id', channelId)
        .eq('user_id', userId)
        .single()

    if (memberError && memberError.code !== 'PGRST116') {
        console.error('[JoinChannel] Error checking membership:', memberError)
        throw new Error(`Failed to check membership: ${memberError.message}`)
    }

    if (existingMember) {
        console.log('[JoinChannel] User is already a member')
        return
    }

    // Add user as channel member
    const { error: joinError } = await supabase.from('channel_members').insert({
        channel_id: channelId,
        user_id: userId,
        role: 'member',
    })

    if (joinError) {
        console.error('[JoinChannel] Error joining channel:', joinError)
        throw new Error(`Failed to join channel: ${joinError.message}`)
    }

    console.log('[JoinChannel] Successfully joined channel')
    revalidatePath('/chat')
}
