'use client'

import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { signOutAction } from '@/lib/actions'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Database } from '@/lib/supabase/types'

interface UserMenuProps {
    email: string
    userData: Database['public']['Tables']['users']['Row'] | null
    userInitials: string
}

export function UserMenu({ email, userData, userInitials }: UserMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar>
                        <AvatarImage
                            src={userData?.avatar_url || undefined}
                            alt={userData?.name || email || ''}
                        />
                        <AvatarFallback>{userInitials}</AvatarFallback>
                    </Avatar>
                </Button>
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
}
