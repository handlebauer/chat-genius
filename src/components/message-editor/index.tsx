'use client'

import './message-editor.css'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useCallback, useRef, KeyboardEvent, useState, useEffect } from 'react'
import Placeholder from '@tiptap/extension-placeholder'
import { ToolbarButtons } from './toolbar-buttons'
import { ActionButtons } from './action-buttons'
import { FilePreview } from './file-preview'
import { CommandList } from './command-list'
import { CommandInput } from './command-input'
import { Channel } from '@/lib/store'
import type { UploadedFile } from '@/hooks/use-file-upload'
import { sendMessage } from '@/lib/actions/send-message'
import { handleQuestionCommand } from '@/lib/actions/ai-commands'
import { stripHtml } from '@/components/search-results'
import { useStore } from '@/lib/store'

interface MessageEditorProps {
    currentChannel: Channel
    userId: string
    dmParticipant?: { name: string; email: string } | null
}

export function MessageEditor({
    currentChannel,
    userId,
    dmParticipant,
}: MessageEditorProps) {
    const editorRef = useRef(null)
    const [, setSelectedFiles] = useState<File[]>([])
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
    const [showCommandList, setShowCommandList] = useState(false)
    const [activeCommand, setActiveCommand] = useState<string | null>(null)
    const [isProcessingCommand, setIsProcessingCommand] = useState(false)
    const [commandText, setCommandText] = useState('')

    const getPlaceholder = () => {
        if (currentChannel.channel_type === 'direct_message') {
            return `Message ${dmParticipant?.name || dmParticipant?.email || 'user'}`
        }
        return `Message #${currentChannel.name.toLowerCase()}`
    }

    const editor = useEditor(
        {
            extensions: [
                StarterKit,
                Placeholder.configure({
                    placeholder: getPlaceholder(),
                    emptyEditorClass: 'is-editor-empty',
                }),
            ],
            content: '',
            autofocus: 'end',
            editorProps: {
                attributes: {
                    class: 'w-full text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 overflow-y-auto min-h-[24px] max-h-[200px]',
                },
                handleKeyDown: (view, event) => {
                    // Prevent Enter key from creating newlines unless Shift is pressed
                    if (event.key === 'Enter' && !event.shiftKey) {
                        return true // Return true to prevent the default behavior
                    }
                    return false
                },
            },
            onUpdate: ({ editor }) => {
                const content = editor.getText()
                const cursorPos = editor.state.selection.$head.pos
                const textBeforeCursor = content.slice(0, cursorPos)

                // Check if we have a command followed by a space
                const commandMatch = textBeforeCursor.match(/^\/(\w+)\s$/)
                if (commandMatch) {
                    // Directly activate the command if it exists
                    const commandId = commandMatch[1]
                    setShowCommandList(false)
                    setActiveCommand(commandId)
                    editor.commands.setContent('')
                    return
                }

                // Show command list if cursor is right after a slash
                if (textBeforeCursor.startsWith('/')) {
                    setShowCommandList(true)
                    setCommandText(textBeforeCursor)
                } else {
                    setShowCommandList(false)
                    setCommandText('')
                }
            },
        },
        [currentChannel.name, dmParticipant],
    )

    // Ensure editor is focused when it's ready
    useEffect(() => {
        if (editor && !activeCommand) {
            // Small delay to ensure the editor is fully initialized
            const timeoutId = setTimeout(() => {
                editor.commands.focus('end')
            }, 0)
            return () => clearTimeout(timeoutId)
        }
    }, [editor, activeCommand])

    const handleKeyDown = useCallback(
        async (event: KeyboardEvent) => {
            // If command list is shown, let the CommandList component handle keyboard events
            if (showCommandList) {
                return
            }

            // If command input is active, let it handle its own keyboard events
            if (activeCommand) {
                return
            }

            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                event.stopPropagation()

                // Check if content is empty or just whitespace after stripping HTML
                const content = editor?.getHTML() || ''
                const strippedContent = stripHtml(content)
                if (strippedContent === '' && uploadedFiles.length === 0) {
                    return
                }

                // Normal message sending
                sendMessage(content, userId, currentChannel.id, uploadedFiles)
                editor?.commands.clearContent()
                setSelectedFiles([])
                setUploadedFiles([])
            } else if (event.key === 'Escape') {
                setShowCommandList(false)
                setActiveCommand(null)
            }
        },
        [editor, sendMessage, uploadedFiles, showCommandList, activeCommand],
    )

    const handleCommandSelect = (commandId: string) => {
        setActiveCommand(commandId)
        setShowCommandList(false)
        editor?.commands.setContent('')
    }

    const handleCommandSubmit = async (args: { [key: string]: string }) => {
        if (isProcessingCommand) return
        setIsProcessingCommand(true)

        try {
            if (activeCommand === 'ask') {
                // Clear the command input immediately
                setActiveCommand(null)
                editor?.commands.focus()

                // Set loading state with the current time
                const pendingTime = new Date().toISOString()
                console.log('📝 Setting AI response loading:', {
                    channelId: currentChannel.id,
                    pendingTime,
                })

                useStore
                    .getState()
                    .setAiResponseLoading(currentChannel.id, true, pendingTime)

                // Send the command
                await handleQuestionCommand(args.question, currentChannel.id)
            }
        } catch (error) {
            console.error('Error processing command:', error)
            // Clear loading state on error
            useStore.getState().setAiResponseLoading(currentChannel.id, false)
        } finally {
            setIsProcessingCommand(false)
            // Don't clear loading state here anymore - it will be cleared when the message arrives
        }
    }

    const handleCommandCancel = () => {
        setActiveCommand(null)
        editor?.commands.focus()
    }

    const handleSend = useCallback(() => {
        if (!editor?.isEmpty || uploadedFiles.length > 0) {
            const content = editor?.getHTML() || ''
            console.log('📨 Sending message:', {
                content,
                attachments: uploadedFiles,
            })
            sendMessage(content, userId, currentChannel.id, uploadedFiles)
            editor?.commands.clearContent()
            setSelectedFiles([])
            setUploadedFiles([])
        }
    }, [editor, sendMessage, uploadedFiles])

    const handleContainerClick = useCallback(
        (e: React.MouseEvent) => {
            if ((e.target as HTMLElement).closest('button')) return
            if (activeCommand) {
                // Find and focus the command input
                const commandInput = (
                    e.currentTarget as HTMLElement
                ).querySelector('.command-input-field') as HTMLInputElement
                commandInput?.focus()
            } else {
                editor?.commands.focus()
            }
        },
        [editor, activeCommand],
    )

    const handleFilesSelected = useCallback((files: File[]) => {
        console.log(
            '📁 Files added to selection:',
            files.map(f => f.name),
        )
        setSelectedFiles(prev => [...prev, ...files])
    }, [])

    const handleFileUploadComplete = useCallback((files: UploadedFile[]) => {
        console.log('💾 Files ready for sending:', files)
        setUploadedFiles(prev => [...prev, ...files])
    }, [])

    const handleFileRemove = useCallback((fileId: string) => {
        console.log('🗑️ Removing file:', fileId)
        setUploadedFiles(prev => prev.filter(f => f.id !== fileId))
    }, [])

    return (
        <div className="p-4 pt-0">
            <div
                className="relative rounded-lg border border-input bg-background/80 transition-all duration-200 hover:bg-background focus-within:bg-background focus-within:border-zinc-400 focus-within:shadow-[0_2px_8px_rgba(0,0,0,0.2)] group cursor-text"
                onClick={handleContainerClick}
            >
                {editor && (
                    <div className="message-editor-container">
                        {showCommandList && (
                            <CommandList
                                isOpen={showCommandList}
                                onSelect={handleCommandSelect}
                                commandText={commandText}
                            />
                        )}
                        <ToolbarButtons editor={editor} />
                        <div className="message-editor-input">
                            {activeCommand ? (
                                <CommandInput
                                    commandId={activeCommand}
                                    onSubmit={handleCommandSubmit}
                                    onCancel={handleCommandCancel}
                                />
                            ) : (
                                <div
                                    className="flex-1"
                                    ref={editorRef}
                                    onKeyDown={handleKeyDown}
                                >
                                    <EditorContent editor={editor} />
                                </div>
                            )}
                        </div>
                        <FilePreview
                            files={uploadedFiles}
                            onRemove={handleFileRemove}
                        />
                        <ActionButtons
                            editor={editor}
                            onSend={handleSend}
                            userId={userId}
                            onFilesSelected={handleFilesSelected}
                            onUploadComplete={handleFileUploadComplete}
                            onFileRemove={handleFileRemove}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
