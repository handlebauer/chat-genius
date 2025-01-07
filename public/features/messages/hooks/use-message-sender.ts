import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

export function useMessageSender(userId: string | undefined, channelId: string | undefined) {
  const supabase = createClientComponentClient<Database>()

  const sendMessage = async (content: string) => {
    if (!userId || !channelId) return

    const { error } = await supabase
      .from('messages')
      .insert({
        content,
        channel_id: channelId,
        sender_id: userId,
      })

    if (error) {
      console.error('Error sending message:', error)
    }
  }

  return sendMessage
}
