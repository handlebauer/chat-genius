import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { signOut } from '@/lib/supabase/auth'

export default async function ChatPage() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl">Welcome, {user.email}</h1>
          <form action={async () => {
            'use server'
            await signOut()
          }}>
            <button
              type="submit"
              className="bg-red-500 text-white px-4 py-2 rounded-md"
            >
              Sign Out
            </button>
          </form>
        </div>
        <p>You are now in a protected chat page!</p>
      </div>
    </div>
  )
}
