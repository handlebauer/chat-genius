'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '../supabase/server'

interface CreateChannelParams {
    name: string
    userId: string
    isPrivate?: boolean
    password?: string
}

export async function createChannel({
    name,
    userId,
    isPrivate = false,
    password,
}: CreateChannelParams) {
    'use server'

    console.log('[CreateChannel] Starting with:', { name, userId, isPrivate })
    const supabase = await createClient()

    // Check if channel already exists
    const { data: existingChannel, error: existingError } = await supabase
        .from('channels')
        .select('id')
        .eq('name', name.toLowerCase())
        .single()

    if (existingError && existingError.code !== 'PGRST116') {
        console.error(
            '[CreateChannel] Error checking existing channel:',
            existingError,
        )
        throw new Error(
            `Failed to check existing channel: ${existingError.message}`,
        )
    }
    if (existingChannel) {
        console.log('[CreateChannel] Channel already exists:', existingChannel)
        throw new Error('Channel already exists')
    }

    // Hash password if provided
    let passwordHash = null
    if (isPrivate && password) {
        const { data: hash, error: hashError } = await supabase.rpc(
            'crypt_password',
            {
                password,
            },
        )

        if (hashError) {
            console.error('[CreateChannel] Error hashing password:', hashError)
            throw new Error(`Failed to hash password: ${hashError.message}`)
        }

        passwordHash = hash
    }

    // Create new channel
    const { data: newChannel, error: createError } = await supabase
        .from('channels')
        .insert({
            name: name.toLowerCase(),
            channel_type: 'channel',
            is_private: isPrivate,
            password_hash: passwordHash,
            created_by: userId,
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
