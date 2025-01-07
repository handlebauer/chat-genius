import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useCallback, useRef } from 'react'
import Placeholder from '@tiptap/extension-placeholder'
import { ToolbarButtons } from './toolbar-buttons'
import { ActionButtons } from './action-buttons'
import './message-editor.css'

interface MessageEditorProps {
  onSend: (content: string) => void
  channelName?: string
}

export function MessageEditor({ onSend, channelName = '' }: MessageEditorProps) {
  const editorRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: `Message #${channelName}`,
        emptyEditorClass: 'is-editor-empty',
      }),
    ],
    content: '',
    autofocus: true,
    editorProps: {
      attributes: {
        class: 'w-full text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 overflow-y-auto min-h-[24px] max-h-[200px]',
      },
      handleKeyDown: (_, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          if (!editor?.isEmpty) {
            const content = editor?.getHTML() || ''
            onSend(content)
            editor?.commands.clearContent()
          }
          return true
        }
        return false
      },
    },
  }, [channelName])

  const handleSend = useCallback(() => {
    if (editor?.isEmpty) return
    const content = editor?.getHTML() || ''
    onSend(content)
    editor?.commands.clearContent()
  }, [editor, onSend])

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    editor?.commands.focus()
  }, [editor])

  if (!channelName) return null

  return (
    <div className="p-4 border-t">
      <div
        className="relative rounded-lg border border-input bg-background/80 transition-all duration-200 hover:bg-background focus-within:bg-background focus-within:border-primary/50 focus-within:shadow-[0_2px_8px_rgba(0,0,0,0.14)] group cursor-text"
        onClick={handleContainerClick}
      >
        <div className="flex flex-col">
          <ToolbarButtons editor={editor} />
          <div className="px-3 py-2">
            <div className="flex-1" ref={editorRef}>
              <EditorContent editor={editor} />
            </div>
          </div>
          <ActionButtons editor={editor} onSend={handleSend} />
        </div>
      </div>
    </div>
  )
}
