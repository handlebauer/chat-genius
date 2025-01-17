'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Database } from '@/lib/supabase/types'

export async function createAvatar(
    originalUserId: string,
): Promise<Database['public']['Tables']['users']['Row']> {
    console.log('[CreateAvatar] Starting with:', { originalUserId })
    const supabase = await createClient()

    // Get the original user's details
    const { data: originalUser, error: userError } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', originalUserId)
        .single()

    if (userError) {
        console.error('[CreateAvatar] Error fetching original user:', userError)
        throw new Error(`Failed to fetch original user: ${userError.message}`)
    }

    // Validate that user has a name
    if (!originalUser.name) {
        throw new Error('Cannot create avatar for user without a name')
    }

    // Extract first name - take everything before the first space, or use the whole name if no space
    const firstName = originalUser.name.split(' ')[0]
    const avatarName = `${firstName}'s Avatar`
    const avatarEmail = `avatar-bot-${originalUserId}@chatgenius.internal`

    // Check if avatar already exists
    const { data: existingAvatar, error: existingError } = await supabase
        .from('users')
        .select()
        .eq('email', avatarEmail)
        .single()

    if (existingError && existingError.code !== 'PGRST116') {
        console.error(
            '[CreateAvatar] Error checking existing avatar:',
            existingError,
        )
        throw new Error(
            `Failed to check existing avatar: ${existingError.message}`,
        )
    }

    if (existingAvatar) {
        console.log('[CreateAvatar] Avatar already exists:', existingAvatar)
        return existingAvatar
    }

    // Create new avatar user
    const { data: newAvatar, error: createError } = await supabase
        .from('users')
        .insert({
            name: avatarName,
            email: avatarEmail,
            avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=avatar',
        })
        .select()
        .single()

    if (createError) {
        console.error('[CreateAvatar] Error creating avatar:', createError)
        throw new Error(`Failed to create avatar: ${createError.message}`)
    }

    console.log('[CreateAvatar] Successfully created avatar:', newAvatar)
    revalidatePath('/chat')
    return newAvatar
}
