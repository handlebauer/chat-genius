import { config } from '@/config'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { type Database } from './types'

export const createFetch =
    (options: Pick<RequestInit, 'next' | 'cache'>) =>
    (url: RequestInfo | URL, init?: RequestInit) => {
        return fetch(url, {
            ...init,
            ...options,
        })
    }

export const createClient = async () => {
    const cookieStore = await cookies()

    return createServerClient<Database>(
        config.NEXT_PUBLIC_SUPABASE_URL!,
        config.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: {
                fetch: createFetch({
                    next: {
                        revalidate: 300,
                        tags: ['supabase'],
                    },
                }),
            },
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options),
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        },
    )
}
