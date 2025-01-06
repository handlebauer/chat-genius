'use client'

import { signInWithDiscord } from '@/lib/supabase/auth'

export default function LoginPage() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <button
        onClick={() => signInWithDiscord()}
        className="bg-[#5865F2] text-white px-6 py-3 rounded-md"
      >
        Sign in with Discord
      </button>
    </div>
  )
}
