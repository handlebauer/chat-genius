import { createServerComponent } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ChatPage() {
  const supabase = createServerComponent()

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
