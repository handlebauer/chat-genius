import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from './types'

// For client-side operations
export const createClientComponent = () => {
  return createClientComponentClient<Database>({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  })
}
