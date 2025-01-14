import { Extension, Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { ChannelMember } from '@/hooks/use-chat-data'

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        mention: {
            insertMention: (member: ChannelMember) => ReturnType
        }
    }
}

// Create a separate node type for mentions
const MentionNode = Node.create({
    name: 'chatMention',
    group: 'inline',
    inline: true,
    selectable: false,
    atom: true,

    addAttributes() {
        return {
            id: {
                default: null,
                parseHTML: element => element.getAttribute('data-user-id'),
                renderHTML: attributes => {
                    if (!attributes.id) {
                        return {}
                    }

                    return {
                        'data-user-id': attributes.id,
                    }
                },
            },
            name: {
                default: null,
                parseHTML: element => element.getAttribute('data-name'),
                renderHTML: attributes => {
                    if (!attributes.name) {
                        return {}
                    }

                    return {
                        'data-name': attributes.name,
                    }
                },
            },
        }
    },

    parseHTML() {
        return [
            {
                tag: 'span[data-mention]',
            },
        ]
    },

    renderHTML({ node, HTMLAttributes }) {
        return [
            'span',
            mergeAttributes(
                { 'data-mention': '' },
                { class: 'mention' },
                HTMLAttributes,
            ),
            `@${node.attrs.name || 'unknown'}`,
        ]
    },

    renderText({ node }) {
        return `@${node.attrs.name || 'unknown'}`
    },
})

// Create the extension that adds the mention command
export const MentionExtension = Extension.create({
    name: 'chatMentionExt',

    addOptions() {
        return {
            HTMLAttributes: {},
            renderLabel({ options, node }: any) {
                return `@${node.attrs.name}`
            },
        }
    },

    addCommands() {
        return {
            insertMention:
                member =>
                ({ commands, chain }) => {
                    const mention = {
                        type: 'chatMention',
                        attrs: {
                            id: member.id,
                            name: member.name || member.email.split('@')[0],
                        },
                    }

                    return chain()
                        .insertContent(mention)
                        .insertContent(' ')
                        .run()
                },
        }
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('chatMention'),
                props: {
                    handleClick(view, pos) {
                        const { state } = view
                        const doc = state.doc
                        const resolvedPos = doc.resolve(pos)
                        const node = resolvedPos.nodeAfter

                        if (node?.type.name === 'chatMention') {
                            // Handle mention click - can be implemented later
                            return true
                        }

                        return false
                    },
                },
            }),
        ]
    },

    addExtensions() {
        return [MentionNode]
    },
})
