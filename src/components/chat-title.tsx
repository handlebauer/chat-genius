import { Hash, MoreVertical, LogOut, Trash2 } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Channel, UserData, useStore } from '@/lib/store'
import { DirectMessageTitle } from './dm-title'
import { Button } from './ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useChannelManagement } from '@/hooks/use-channel-management'

interface ChatTitleProps {
    currentChannel: Channel
    userData: UserData
}

function ChannelTitle({
    channel,
    userId,
}: {
    channel: Channel
    userId: string
}) {
    const isChannelMember = useStore(state => state.isChannelMember)
    const { leaveChannel, deleteChannel, canDeleteChannel } =
        useChannelManagement(userId)
    const isMember = isChannelMember(channel.id)
    const canDelete = canDeleteChannel(channel.id)
    const isOwner = channel.created_by === userId

    return (
        <div className="flex items-center gap-2">
            <div className="flex items-center">
                <Hash className="mr-[2px] w-[18px] h-[18px] text-zinc-900" />
                <h2 className="font-medium text-zinc-900">
                    {channel.name.toLowerCase()}
                </h2>
            </div>

            {isMember && (canDelete || (!isOwner && isMember)) && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="px-2 h-8 hover:bg-zinc-100 rounded-sm"
                        >
                            <MoreVertical className="h-5 w-5 text-zinc-600 hover:text-zinc-400 transition-colors" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        {!isOwner && isMember && (
                            <DropdownMenuItem
                                onClick={() => leaveChannel(channel.id)}
                                className="gap-2"
                            >
                                <LogOut className="h-4 w-4" />
                                Leave Channel
                            </DropdownMenuItem>
                        )}
                        {canDelete && (
                            <DropdownMenuItem
                                onClick={() => deleteChannel(channel.id)}
                                className="gap-2 text-red-600 focus:text-red-600"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete Channel
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    )
}

export function ChatTitle({ currentChannel, userData }: ChatTitleProps) {
    return (
        <div className="flex items-center justify-center">
            {currentChannel.channel_type === 'direct_message' ? (
                <DirectMessageTitle
                    currentChannelId={currentChannel.id}
                    userId={userData.id}
                />
            ) : (
                <ChannelTitle channel={currentChannel} userId={userData.id} />
            )}
        </div>
    )
}
