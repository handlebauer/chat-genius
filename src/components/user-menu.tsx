import { memo, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { signOutAction } from '@/lib/actions/sign-out'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface UserMenuProps {
    email: string
    name: string | null
    avatar_url: string | null
}

const UserAvatar = memo(function UserAvatar({
    email,
    name,
    avatar_url,
}: UserMenuProps) {
    const userInitials = useMemo(() => {
        return name
            ? name.substring(0, 2).toUpperCase()
            : email.substring(0, 2).toUpperCase()
    }, [name, email])

    // Stabilize the src prop by not passing undefined
    const avatarSrc = avatar_url || ''
    const avatarAlt = name || email || ''

    return (
        <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar>
                <AvatarImage src={avatarSrc} alt={avatarAlt} />
                <AvatarFallback>{userInitials}</AvatarFallback>
            </Avatar>
        </Button>
    )
})

export const UserMenu = memo(function UserMenu({
    email,
    name,
    avatar_url,
}: UserMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <DropdownMenuTrigger asChild>
                    <UserAvatar
                        email={email}
                        name={name}
                        avatar_url={avatar_url}
                    />
                </DropdownMenuTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuItem disabled>{email}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={signOutAction}>
                    <DropdownMenuItem asChild>
                        <button className="flex items-center w-full cursor-pointer">
                            <LogOut className="mr-2 w-4 h-4" />
                            Sign out
                        </button>
                    </DropdownMenuItem>
                </form>
            </DropdownMenuContent>
        </DropdownMenu>
    )
})
