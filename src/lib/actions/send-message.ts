'use server'

import type { UploadedFile } from '@/hooks/use-file-upload'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendMessage(
    content: string,
    userId: string,
    channelId: string,
    attachments: UploadedFile[] = [],
) {
    const supabase = await createClient()

    console.log('🚀 Sending message')

    const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
            content,
            channel_id: channelId,
            sender_id: userId,
        })
        .select()
        .single()

    console.log(message)

    if (messageError) throw messageError

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
