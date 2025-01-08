import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })

    const { data: { user }, error: authError } = await supabase.auth.exchangeCodeForSession(code)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.redirect(new URL('/login', requestUrl.origin))
    }

    // Get user details from the provider
    const { data: { user: providerUser }, error: userError } = await supabase.auth.getUser()

    if (userError || !providerUser?.user_metadata) {
      console.error('User data error:', userError)
      return NextResponse.redirect(new URL('/login', requestUrl.origin))
    }

    // Extract user metadata based on provider
    const metadata = providerUser.user_metadata
    const provider = providerUser.app_metadata?.provider
    let name = ''
    let avatarUrl = ''

    if (provider === 'discord') {
      name = metadata.full_name || metadata.name || metadata.user_name || metadata.email
      avatarUrl = metadata.avatar_url
    } else if (provider === 'github') {
      // GitHub stores username in user_name or preferred_username
      name = metadata.name || metadata.preferred_username || metadata.user_name || metadata.email
      // GitHub avatar is in avatar_url
      avatarUrl = metadata.avatar_url
    }

    // Ensure we have at least some name value
    if (!name && user.email) {
      name = user.email.split('@')[0] // Use email username as fallback
    }

    // Create or update user record
    const { error: upsertError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email!,
        name: name,
        avatar_url: avatarUrl,
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
