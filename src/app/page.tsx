import { redirect } from 'next/navigation'
import { createServerComponent } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = createServerComponent()

  const { data: { user } } = await supabase.auth.getUser()

  // Redirect based on auth status
  if (user) {
    redirect('/chat')
  } else {
    redirect('/login')
  }
}
