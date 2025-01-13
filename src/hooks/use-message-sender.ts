import type { UploadedFile } from '@/hooks/use-file-upload'
import { createClient } from '@/lib/supabase/client'

export function useMessageSender(
    userId: string | undefined,
    channelId: string | undefined,
) {
    const supabase = createClient()

    const onSend = async (content: string, attachments?: UploadedFile[]) => {
        if (!userId || !channelId) return

        // Insert the message first
        const { data: message, error: messageError } = await supabase
            .from('messages')
            .insert({
                content,
                channel_id: channelId,
                sender_id: userId,
            })
            .select()
            .single()

        if (messageError) {
            console.error('Error sending message:', messageError)
            return
        }

        // If there are attachments, link them to the message
        if (attachments?.length) {
            const { error: attachmentError } = await supabase
                .from('attachments')
                .insert(
                    attachments.map(attachment => ({
                        ...attachment,
                        message_id: message.id,
                    })),
                )

            if (attachmentError) {
                console.error('Error linking attachments:', attachmentError)
            }
        }

        return message
    }

    return { onSend }
}
