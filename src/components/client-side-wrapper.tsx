'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { MessageEditor } from './message-editor'
import { DirectMessagesList } from './direct-messages-list'
import { MessagesSection } from './messages-section'
import { ChatHeader } from './chat-header'
import { ChannelList } from './channel-list'
import { ChatTitle } from './chat-title'
import { MessageSearch } from './message-search'
import { UserMenu } from './user-menu'
import { Channel, UserData, useStore } from '@/lib/store'
import { MembersSidebar } from './members-sidebar'
import { useChatStore } from '@/hooks/use-chat-store'
import { JoinChannelPrompt } from './join-channel-prompt'

interface ClientSideWrapperProps {
    channelId: string
    userData: UserData
    initialData: {
        channels: Channel[]
        directMessages: Channel[]
        channelMemberships: Record<string, boolean>
    }
    currentChannelMembers: {
        id: string
        name: string | null
        email: string
        avatar_url: string | null
        role: 'owner' | 'admin' | 'member'
    }[]
}

export function ClientSideWrapper({
    channelId,
    userData,
    initialData,
    currentChannelMembers,
}: ClientSideWrapperProps) {
    const { channels, directMessages, currentChannel, isHydrated } =
        useChatStore(channelId, initialData)
    const isChannelMember = useStore(state => state.isChannelMember)

    if (!isHydrated || !currentChannel) {
        return null
    }

    const isMember =
        currentChannel.channel_type === 'direct_message' ||
        isChannelMember(currentChannel.id)

    return (
        <>
            <div className="flex flex-col w-64 border-r bg-zinc-50">
                <div className="flex items-center px-4 h-14 border-b">
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-800">
                        ChatGenius
                    </h1>
                </div>

                <ScrollArea className="flex-1">
                    <ChannelList userData={userData} channels={channels} />
                    <Separator className="my-2" />
                    <DirectMessagesList
                        userData={userData}
                        currentChannel={currentChannel}
                        directMessages={directMessages}
                    />
                </ScrollArea>
            </div>

            <div className="flex flex-1 relative">
                <div className="flex flex-col flex-1">
                    <ChatHeader>
                        <ChatTitle
                            currentChannel={currentChannel}
                            userData={userData}
                        />
                        <div className="flex items-center gap-4">
                            <MessageSearch />
                            <UserMenu
                                email={userData.email}
                                name={userData.name}
                                avatar_url={userData.avatar_url}
                            />
                        </div>
                    </ChatHeader>

                    <div className="flex flex-col flex-1 mt-14 h-[calc(100vh-3.5rem)]">
                        {isMember ? (
                            <>
                                <MessagesSection
                                    currentChannelId={channelId}
                                    userData={userData}
                                />
                                <div className="pb-1">
                                    <MessageEditor
                                        currentChannel={currentChannel}
                                        userId={userData.id}
                                        dmParticipant={undefined}
                                    />
                                </div>
                            </>
                        ) : (
                            <JoinChannelPrompt
                                channelId={currentChannel.id}
                                channelName={currentChannel.name}
                                userId={userData.id}
                            />
                        )}
                    </div>
                </div>
                {currentChannel.channel_type !== 'direct_message' &&
                    isMember && (
                        <MembersSidebar
                            members={currentChannelMembers}
                            userId={userData.id}
                        />
                    )}
            </div>
        </>
    )
}
