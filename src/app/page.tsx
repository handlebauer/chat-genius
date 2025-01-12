import { useEffect } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { useStore } from '@/lib/store'
import { UserMetadata } from '@supabase/supabase-js'

export default async function HomePage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const setUserData = useStore(state => state.setUserData)

    useEffect(() => {
        if (user) {
            setUserData(user)
        }
    }, [user])

    // Redirect based on auth status
    if (user) {
        redirect('/chat')
    } else {
        redirect('/login')
    }
}
