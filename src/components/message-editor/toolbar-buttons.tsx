import { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Bold, Italic, Strikethrough } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolbarButtonsProps {
    editor: Editor | null
}

export function ToolbarButtons({ editor }: ToolbarButtonsProps) {
    return (
        <div className="message-editor-toolbar flex gap-1 px-[1px] py-1 bg-zinc-50/30">
            <Button
                variant="ghost"
                size="sm"
                className={cn(
                    'h-8 w-8 p-0 hover:bg-transparent text-zinc-400 group-focus-within:text-zinc-600 transition-colors',
                    editor?.isActive('bold') && 'text-zinc-900',
                )}
                onClick={() => editor?.chain().focus().toggleBold().run()}
            >
                <Bold className="w-4 h-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className={cn(
                    'h-8 w-8 p-0 hover:bg-transparent text-zinc-400 group-focus-within:text-zinc-600 transition-colors',
                    editor?.isActive('italic') && 'text-zinc-900',
                )}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
                <Italic className="w-4 h-4" />
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className={cn(
                    'h-8 w-8 p-0 hover:bg-transparent text-zinc-400 group-focus-within:text-zinc-600 transition-colors',
                    editor?.isActive('strike') && 'text-zinc-900',
                )}
                onClick={() => editor?.chain().focus().toggleStrike().run()}
            >
                <Strikethrough className="w-4 h-4" />
            </Button>
        </div>
    )
}
