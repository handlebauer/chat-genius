'use server'

import type { UploadedFile } from '@/hooks/use-file-upload'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { parseMentions } from '@/lib/utils/mentions'

export async function sendMessage(
    content: string,
    userId: string,
    channelId: string,
    attachments: UploadedFile[] = [],
) {
    const supabase = await createClient()

    console.log('🚀 Sending message')

    // Start a transaction
    const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
            content,
            channel_id: channelId,
            sender_id: userId,
        })
        .select()
        .single()

    if (messageError) throw messageError

    // Handle mentions
    const mentionedUserIds = parseMentions(content)
    if (mentionedUserIds.length > 0) {
        // Verify these users exist and are members of the channel
        const { data: validUsers } = await supabase
            .from('channel_members')
            .select('user_id')
            .eq('channel_id', channelId)
            .in('user_id', mentionedUserIds)

        if (validUsers) {
            const validUserIds = validUsers.map(u => u.user_id)
            // TODO: In the future, we might want to add a mentions table
            // and trigger notifications here
            console.log('Valid mentions:', validUserIds)
        }
    }

    if (attachments.length) {
        const { error: attachmentError } = await supabase
            .from('attachments')
            .insert(
                attachments.map(attachment => ({
                    ...attachment,
                    message_id: message.id,
                })),
            )

        if (attachmentError) throw attachmentError
    }

    // Revalidate the messages for this channel
    revalidatePath(`/channels/${channelId}`)

    return message
}
