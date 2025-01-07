import { useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/supabase/types'
import { useStore } from '@/lib/store'

export function useUserData(userId: string) {
  const supabase = createClientComponentClient<Database>()
  const { userData, setUserData } = useStore()

  useEffect(() => {
    async function loadUserData() {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error loading user data:', error)
        return
      }

      if (user) {
        setUserData(user)
      }
    }

    loadUserData()
  }, [userId, supabase, setUserData])

  return userData
}
