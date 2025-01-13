import { config } from '@/config'
import { createBrowserClient } from '@supabase/ssr'
import { Database } from './types'

export function createClient() {
    return createBrowserClient<Database>(
        config.NEXT_PUBLIC_SUPABASE_URL!,
        config.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
}
