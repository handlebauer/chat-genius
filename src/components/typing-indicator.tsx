import { cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { TextShimmer } from '@/components/ui/text-shimmer'
import { useMemo } from 'react'

interface TypingIndicatorProps {
    name: string
    avatarUrl: string
    className?: string
}

export function TypingIndicator({
    name,
    avatarUrl,
    className,
}: TypingIndicatorProps) {
    const time = useMemo(() => {
        const date = new Date()
        return date.toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
        })
    }, [])

    return (
        <div
            className={cn(
                'relative transition-colors duration-200 rounded-lg group hover:bg-zinc-100',
                className,
            )}
        >
            <div className="flex gap-2 items-start p-1 pb-[2px] relative">
                <Avatar className="w-7 h-7 mt-[2px]">
                    <AvatarImage src={avatarUrl} alt={name} />
                    <AvatarFallback className="text-xs">
                        {name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="space-y-0.5 flex-1">
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium">{name}</span>
                        <span className="text-[11px] text-zinc-500 font-normal">
                            {time}
                        </span>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <TextShimmer duration={1.5} spread={1}>
                            typing...
                        </TextShimmer>
                    </div>
                </div>
            </div>
        </div>
    )
}
