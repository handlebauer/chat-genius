import { useEffect } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { useStore } from '@/lib/store'
import type { Database } from '@/lib/supabase/types'

export default async function HomePage() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Redirect based on auth status
    if (user) {
        redirect('/chat')
    } else {
        redirect('/login')
    }
}
