import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/types'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })

    const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.redirect(new URL('/login', requestUrl.origin))
    }

    // Get user details from Discord
    const { data: { user: discordUser }, error: userError } = await supabase.auth.getUser()

    if (userError || !discordUser?.user_metadata) {
      console.error('User data error:', userError)
      return NextResponse.redirect(new URL('/login', requestUrl.origin))
    }

    // Create or update user record
    const { error: upsertError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email!,
        name: discordUser.user_metadata.full_name || discordUser.user_metadata.name || discordUser.user_metadata.user_name,
        avatar_url: discordUser.user_metadata.avatar_url,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id'
      })

    if (upsertError) {
      console.error('Database error:', upsertError)
      // Continue with the flow even if upsert fails
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/chat', requestUrl.origin))
}
