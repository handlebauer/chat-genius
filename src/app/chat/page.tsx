import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { signOutAction } from '@/lib/actions'

export default async function ChatPage() {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-4 min-h-screen">
      <div className="mx-auto max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl">Welcome, {user.email}</h1>
          <form action={signOutAction}>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-red-500 rounded-md"
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
