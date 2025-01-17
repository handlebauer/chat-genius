import { useStore } from '@/lib/store'

export interface CommandArg {
    name: string
    placeholder: string
    required: true
    getLabel?: () => string
}

export interface Command {
    id: string
    name: string
    description: string
    args: CommandArg[]
}

export const commands: Command[] = [
    {
        id: 'ask-channel',
        name: '/ask-channel',
        description: 'Ask a question about the current channel',
        args: [
            {
                name: 'question',
                placeholder: 'what is the question?',
                required: true,
                getLabel: () => {
                    const store = useStore.getState()
                    const channelId = store.activeChannelId
                    const channel = store.channels.find(c => c.id === channelId)

                    if (
                        channel?.channel_type === 'direct_message' &&
                        store.userData
                    ) {
                        // For DM channels, show the other participant's name
                        const otherParticipant = store.getDMParticipant(
                            channelId,
                            store.userData.id,
                        )
                        return otherParticipant?.name || 'DM'
                    }

                    return channel?.name ? `#${channel.name}` : 'channel'
                },
            },
        ],
    },
    {
        id: 'ask-all-channels',
        name: '/ask-all-channels',
        description: 'Ask a question about all channels',
        args: [
            {
                name: 'question',
                placeholder: 'what is the question?',
                required: true,
            },
        ],
    },
]

export const commandArgs: Record<string, CommandArg[]> = commands.reduce(
    (acc, command) => ({
        ...acc,
        [command.id]: command.args,
    }),
    {},
)
