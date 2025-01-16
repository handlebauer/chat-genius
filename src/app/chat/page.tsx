import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ChatPage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Try to get the 'general' channel first
    let { data: generalChannel } = await supabase
        .from('channels')
        .select('id')
        .eq('name', 'general')
        .single()

    // If 'general' exists, redirect to it
    if (generalChannel?.id) {
        redirect(`/chat/${generalChannel.id}`)
    }

    // If 'general' doesn't exist, fall back to the most recently created channel
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
