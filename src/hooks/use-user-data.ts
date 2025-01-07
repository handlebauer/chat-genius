import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'

export function useUserData(userId: string) {
  const [userData, setUserData] = useState<Database['public']['Tables']['users']['Row'] | null>(null)
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    async function loadUserData() {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error loading user data:', error)
        return
      }

      setUserData(data)
    }

    loadUserData()
  }, [userId, supabase])

  return userData
}
