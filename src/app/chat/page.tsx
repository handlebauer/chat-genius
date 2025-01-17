import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const DEFAULT_CHANNEL =
    process.env.NODE_ENV === 'production' ? 'hello' : 'general'

export default async function ChatPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Try to get the default channel first
    let { data: defaultChannel } = await supabase
        .from('channels')
        .select('id')
        .eq('name', DEFAULT_CHANNEL)
        .single()

    // If default channel exists, redirect to it
    if (defaultChannel?.id) {
        redirect(`/chat/${defaultChannel.id}`)
    }

    // If default channel doesn't exist, fall back to the most recently created channel
    const { data: latestChannel } = await supabase
        .from('channels')
        .select('id')
        .eq('channel_type', 'channel')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

    if (latestChannel?.id) {
        redirect(`/chat/${latestChannel.id}`)
    }

    // If no channels exist, redirect to chat root (this shouldn't happen in practice)
    redirect('/chat')
}
