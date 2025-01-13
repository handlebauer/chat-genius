import { redirect } from 'next/navigation'
import { ChatInterface } from '@/components/chat-interface'
import { createClient } from '@/lib/supabase/server'

type Params = Promise<{ channelId: string }>

export const ChatChannelPage = async ({ params }: { params: Params }) => {
    const { channelId } = await params
    const supabase = await createClient()

    const [authResponse, channelResponse] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('channels').select('id').eq('id', channelId).single(),
    ])

    const {
        data: { user },
    } = authResponse
    const { data: channel } = channelResponse

    if (!user) redirect('/login')
    if (!channel) redirect('/chat')

    return <ChatInterface user={user} channelId={channelId} />
}

export default ChatChannelPage
