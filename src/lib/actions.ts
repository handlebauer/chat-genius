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
