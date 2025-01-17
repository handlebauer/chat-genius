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
import { Channel, useIsChannelMember } from '@/lib/store'
import { MembersSidebar } from './members-sidebar'
import { useChatStore } from '@/hooks/use-chat-store'

import { JoinChannelPrompt } from './join-channel-prompt'
import {
    ChannelMember,
    ChannelMemberships,
    DMUser,
} from '@/hooks/use-chat-data'
import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import { useShallow } from 'zustand/react/shallow'
import { useDebugRender } from '@/hooks/use-debug-render'

interface ClientSideWrapperProps {
    channelId: string
    userData: {
        id: string
        name: string | null
        email: string
        avatar_url: string | null
        created_at: string | null
        updated_at: string | null
        status: string | null
    }
    initialData: {
        channels: Channel[]
        directMessages: Channel[]
        channelMemberships: ChannelMemberships
        dmUsers: Record<string, DMUser>
    }
    currentChannelMembers: ChannelMember[]
}

export function ClientSideWrapper({
    channelId,
    userData,
    initialData,
    currentChannelMembers,
}: ClientSideWrapperProps) {
    const { channels, directMessages, currentChannel, isHydrated } =
        useChatStore(channelId, initialData)

    const dmParticipants = useStore(useShallow(state => state.dmParticipants))

    const isChannelMember = useIsChannelMember()

    const systemUserId = useMemo(() => {
        console.log('[Memo] systemUserId recalculating')
        return (
            currentChannelMembers.find(
                member => member.email === 'ai-bot@test.com',
            )?.id || ''
        )
    }, [currentChannelMembers])

    const isMember = useMemo(
        () =>
            currentChannel?.channel_type === 'direct_message' ||
            (currentChannel && isChannelMember(currentChannel.id)),
        [currentChannel, isChannelMember],
    )

    if (!isHydrated) {
        console.log('Not hydrated')
        return null
    }

    if (!currentChannel) {
        console.log('No current channel')
        return null
    }

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
                        dmUsers={dmParticipants}
                    />
                </ScrollArea>
            </div>

            <div className="flex flex-1 relative">
                <div className="flex flex-col flex-1">
                    <ChatHeader>
                        <ChatTitle
                            currentChannel={currentChannel}
                            userData={userData}
                            currentChannelMembers={currentChannelMembers}
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
                                    currentChannel={currentChannel}
                                    dmParticipant={
                                        dmParticipants[currentChannel.id]
                                    }
                                />
                                <div className="pb-1">
                                    <MessageEditor
                                        currentChannel={currentChannel}
                                        userId={userData.id}
                                        dmParticipant={undefined}
                                        currentChannelMembers={
                                            currentChannelMembers
                                        }
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
                            systemUserId={systemUserId}
                        />
                    )}
            </div>
        </>
    )
}
