import { memo, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStatusColor } from '@/lib/utils/status'
import type { DMUser } from '@/hooks/use-chat-data'

interface DirectMessageUserProps {
    user: DMUser & { status: string }
    isActive: boolean
    onClick: () => void
}

export const DirectMessageUser = memo(function DirectMessageUser({
    user,
    isActive,
    onClick,
}: DirectMessageUserProps) {
    const buttonClassName = useMemo(
        () =>
            cn(
                'flex items-center gap-1 justify-start w-full hover:bg-zinc-200 py-1 h-auto',
                isActive && 'bg-zinc-200',
            ),
        [isActive],
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
        </Button>
    )
})
