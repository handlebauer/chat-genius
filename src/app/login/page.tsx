'use client'

import { signInWithDiscord, signInWithGithub } from '@/lib/supabase/auth'

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-4 justify-center items-center min-h-screen">
      <button
        onClick={() => signInWithDiscord()}
        className="bg-[#5865F2] text-white px-6 py-3 rounded-md"
      >
        Sign in with Discord
      </button>
      <button
        onClick={() => signInWithGithub()}
        className="bg-[#24292e] text-white px-6 py-3 rounded-md"
      >
        Sign in with GitHub
      </button>
    </div>
  )
}
