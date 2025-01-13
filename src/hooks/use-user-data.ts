import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { createClient } from '@/lib/supabase/client'

export function useUserData(userId: string) {
    const supabase = createClient()
    const userData = useStore(state => state.userData)
    const setUserData = useStore(state => state.setUserData)

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

    return { userData }
}
