import { config } from '@/config'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { joinDefaultChannels } from '@/lib/actions/join-default-channels'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(
        config.NEXT_PUBLIC_SUPABASE_URL!,
        config.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value),
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options),
                    )
                },
            },
        },
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Handle non-authenticated users
    if (
        !user &&
        !request.nextUrl.pathname.startsWith('/login') &&
        !request.nextUrl.pathname.startsWith('/auth')
    ) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // If we have a user, check if they need to join default channels
    if (user) {
        const { data: memberships } = await supabase
            .from('channel_members')
            .select('id')
            .eq('user_id', user.id)
            .limit(1)

        console.log('[UpdateSession] Found memberships:', memberships)

        // If no memberships found, this is a new user
        if (!memberships?.length) {
            console.log(
                '[UpdateSession] New user detected, joining default channels',
            )
            await joinDefaultChannels(user.id)
        }

        // Redirect to chat if on auth-related pages
        if (
            request.nextUrl.pathname.startsWith('/login') ||
            request.nextUrl.pathname.startsWith('/register') ||
            request.nextUrl.pathname.startsWith('/auth')
        ) {
            const url = request.nextUrl.clone()
            url.pathname = '/chat'
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
