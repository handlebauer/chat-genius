import type { ReactNode } from 'react'

interface ChatHeaderProps {
    children: ReactNode
}

export function ChatHeader({ children }: ChatHeaderProps) {
    return (
        <div className="flex justify-between items-center px-4 h-14 border-b bg-zinc-50 absolute top-0 left-0 right-0">
            {children}
        </div>
    )
}
