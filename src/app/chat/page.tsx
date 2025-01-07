import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function ChatPage() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get the first channel and redirect to it
  const { data: channels } = await supabase
    .from('channels')
    .select('id')
    .order('created_at')
    .limit(1)
    .single()

  if (channels?.id) {
    redirect(`/chat/${channels.id}`)
  }

  // If no channels exist, redirect to chat root (this shouldn't happen in practice)
  redirect('/chat')
}
