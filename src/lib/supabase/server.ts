import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from './types'

export const createServerComponent = () => {
  return createServerComponentClient<Database>({ cookies })
}
