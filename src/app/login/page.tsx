'use client'

import { signInWithDiscord, signInWithGithub } from '@/lib/supabase/auth'
import { FaDiscord, FaGithub } from 'react-icons/fa'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle, MinusCircle } from 'lucide-react'

const features = [
  {
    title: 'Authentication',
    status: 'checked',
    description: 'Discord and GitHub OAuth integration using Supabase Auth with automatic user session management and protected routes.'
  },
  {
    title: 'Real-time messaging',
    status: 'checked',
    description: 'Real-time message delivery using Supabase\'s Realtime feature with optimistic updates and automatic channel subscriptions.'
  },
  {
    title: 'Channel/DM Organization',
    status: 'checked',
    description: 'Organized communication through public channels and private direct messages with a collapsible sidebar interface.'
  },
  {
    title: 'File sharing & search',
    status: 'checked',
    description: 'Full file upload support with preview capabilities and a message search system using Supabase\'s full-text search.'
  },
  {
    title: 'User presence, & status',
    status: 'wip',
    description: 'Basic online/offline status implemented through Supabase\'s Realtime features, with typing indicators and away status planned.'
  },
  {
    title: 'Thread support',
    status: 'unchecked',
    description: 'Will allow users to create threaded conversations from any message with their own real-time updates and notifications.'
  },
  {
    title: 'Emoji reactions',
    status: 'unchecked',
    description: 'Will enable users to react to messages with emojis, including frequently used suggestions and custom emoji support.'
  }
]

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'checked') return <CheckCircle className="h-5 w-5 text-green-500" />
  if (status === 'wip') return <MinusCircle className="h-5 w-5 text-yellow-500" />
  return <Circle className="h-5 w-5 text-gray-300" />
}

export default function LoginPage() {
  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="snap-y snap-mandatory h-screen overflow-auto">
      <section className="snap-start h-screen flex flex-col relative">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808025_1px,transparent_1px),linear-gradient(to_bottom,#80808025_1px,transparent_1px)] bg-[size:14px_24px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,white_85%)]" />
        </div>

        {/* Features button */}
        <div className="relative z-10 flex justify-end p-6">
          <Button
            variant="ghost"
            onClick={scrollToFeatures}
            className="text-zinc-700 hover:text-zinc-900 text-lg px-6 py-3"
          >
            Features
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center">
          <div className="relative z-10 flex flex-col items-center gap-8 w-full">
            <div className="text-center space-y-3">
              <h1 className="text-7xl font-bold font-display tracking-tight">
                <span className="text-zinc-700">Chat</span>
                <span className="text-transparent [-webkit-text-stroke:3px_#3f3f46]">Genius</span>
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
      </section>

      <section id="features" className="snap-start min-h-screen bg-white relative">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808025_1px,transparent_1px),linear-gradient(to_bottom,#80808025_1px,transparent_1px)] bg-[size:14px_24px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,white_85%)]" />
        </div>

        <div className="relative z-10 container mx-auto px-4 py-24">
          <h2 className="text-4xl font-bold text-center mb-20 text-zinc-700">Features</h2>

          <div className="max-w-2xl mx-auto space-y-16">
            <Accordion type="single" collapsible className="w-full space-y-4">
              {features.map((feature, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border rounded-lg bg-white/80 backdrop-blur-sm px-6"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <StatusIcon status={feature.status} />
                      <span className="text-lg font-medium">{feature.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-zinc-600">
                    {feature.description}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </div>
  )
}
