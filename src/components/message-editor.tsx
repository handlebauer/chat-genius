'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Button } from '@/components/ui/button'
import { Send, Bold, Italic, Strikethrough } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCallback, useRef } from 'react'

interface MessageEditorProps {
  onSend: (content: string) => void
}

export function MessageEditor({ onSend }: MessageEditorProps) {
  const editorRef = useRef(null)

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        class: 'min-h-[44px] max-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 overflow-y-auto',
      },
      handleKeyDown: (view, event) => {
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
  })

  const handleSend = useCallback(() => {
    if (editor?.isEmpty) return
    const content = editor?.getHTML() || ''
    onSend(content)
    editor?.commands.clearContent()
  }, [editor, onSend])

  return (
    <div className="p-4 border-t">
      <div className="space-y-2">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 w-8 p-0',
              editor?.isActive('bold') && 'bg-muted'
            )}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 w-8 p-0',
              editor?.isActive('italic') && 'bg-muted'
            )}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 w-8 p-0',
              editor?.isActive('strike') && 'bg-muted'
            )}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <Strikethrough className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <div className="flex-1" ref={editorRef}>
            <EditorContent editor={editor} />
          </div>
          <Button
            size="icon"
            className="shrink-0"
            disabled={!editor || editor.isEmpty}
            onClick={handleSend}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
