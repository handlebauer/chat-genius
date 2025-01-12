import { config } from '@/config'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        config.NEXT_PUBLIC_SUPABASE_URL!,
        config.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
}
