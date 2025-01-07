'use client'

import { signInWithDiscord, signInWithGithub } from '@/lib/supabase/auth'
import { FaDiscord, FaGithub } from 'react-icons/fa'

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-8 justify-center items-center min-h-screen bg-white relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808025_1px,transparent_1px),linear-gradient(to_bottom,#80808025_1px,transparent_1px)] bg-[size:14px_24px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,white_85%)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="text-center space-y-3">
          <h1 className="text-7xl font-bold font-display tracking-tight text-transparent [-webkit-text-stroke:3px_#3f3f46]">
            ChatGenius
          </h1>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs px-0">
          <button
            onClick={() => signInWithDiscord()}
            className="flex items-center justify-center gap-3 bg-white/90 backdrop-blur-sm border-2 border-[#5865F2] text-[#5865F2] px-0 py-3.5 rounded-xl font-medium transition-all hover:bg-[#5865F2] hover:text-white"
          >
            <FaDiscord className="text-xl" />
            Sign in with Discord
          </button>

          <button
            onClick={() => signInWithGithub()}
            className="flex items-center justify-center gap-3 bg-white/90 backdrop-blur-sm border-2 border-[#24292e] text-[#24292e] px-0 py-3.5 rounded-xl font-medium transition-all hover:bg-[#24292e] hover:text-white"
          >
            <FaGithub className="text-xl" />
            Sign in with GitHub
          </button>
        </div>
      </div>
    </div>
  )
}
