'use client'

import './message-editor.css'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useCallback, useRef, KeyboardEvent, useState } from 'react'
import Placeholder from '@tiptap/extension-placeholder'
import { ToolbarButtons } from './toolbar-buttons'
import { ActionButtons } from './action-buttons'
import { FilePreview } from './file-preview'
import { Channel } from '@/lib/store'
import type { UploadedFile } from '@/hooks/use-file-upload'
import { sendMessage } from '@/lib/actions/send-message'

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
            autofocus: true,
            editorProps: {
                attributes: {
                    class: 'w-full text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 overflow-y-auto min-h-[24px] max-h-[200px]',
                },
            },
            immediatelyRender: false,
        },
        [currentChannel.name, dmParticipant],
    )

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                if (!editor?.isEmpty || uploadedFiles.length > 0) {
                    const content = editor?.getHTML() || ''
                    sendMessage(
                        content,
                        userId,
                        currentChannel.id,
                        uploadedFiles,
                    )
                    editor?.commands.clearContent()
                    setSelectedFiles([])
                    setUploadedFiles([])
                }
            }
        },
        [editor, sendMessage, uploadedFiles],
    )

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
            editor?.commands.focus()
        },
        [editor],
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
                    <div className="flex flex-col">
                        <ToolbarButtons editor={editor} />
                        <div className="px-3 py-2">
                            <div
                                className="flex-1"
                                ref={editorRef}
                                onKeyDown={handleKeyDown}
                            >
                                <EditorContent editor={editor} />
                            </div>
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
