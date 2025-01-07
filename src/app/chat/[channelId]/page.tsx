import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ChatInterface } from '@/components/chat-interface'

type Params = Promise<{ channelId: string }>

const ChatChannelPage = async (props: { params: Params }) => {
  const params = await props.params
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const [{ data: { user } }, { data: channel }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('channels').select('id').eq('id', params.channelId).single()
  ])

  if (!user) {
    redirect('/login')
  }

  if (!channel) {
    redirect('/chat')
  }

  return <ChatInterface user={user} />
}

export default ChatChannelPage

