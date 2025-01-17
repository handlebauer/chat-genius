import { memo, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStatusColor } from '@/lib/utils/status'
import { useStore } from '@/lib/store'
import type { DMUser } from '@/hooks/use-chat-data'

interface DirectMessageUserProps {
    user: DMUser & { status: string }
    isActive: boolean
    onClick: () => void
    channelId: string
}

export const DirectMessageUser = memo(function DirectMessageUser({
    user,
    isActive,
    onClick,
    channelId,
}: DirectMessageUserProps) {
    const unreadCount = useStore(state => state.unreadCounts[channelId] || 0)

    const buttonClassName = useMemo(
        () =>
            cn(
                'flex items-center gap-1 justify-start w-full hover:bg-zinc-200 py-1 h-auto',
                isActive && 'bg-zinc-200',
                !isActive && unreadCount > 0 && 'font-semibold',
            ),
        [isActive, unreadCount],
    )

    const statusClassName = useMemo(
        () => `scale-[0.5] ${getStatusColor(user.status)} fill-current`,
        [user.status],
    )

    const displayName = useMemo(
        () => user.name || user.email,
        [user.name, user.email],
    )

    if (!displayName) return null

    return (
        <Button variant="ghost" className={buttonClassName} onClick={onClick}>
            <Circle className={statusClassName} />
            {displayName}
            {unreadCount > 0 && (
                <div
                    className={cn(
                        'ml-auto flex items-center justify-center',
                        'min-w-[18px] h-[18px] px-1',
                        'text-xs font-semibold',
                        'bg-zinc-500 text-white',
                        'rounded-full',
                        isActive && 'bg-zinc-600',
                    )}
                >
                    {unreadCount}
                </div>
            )}
        </Button>
    )
})
