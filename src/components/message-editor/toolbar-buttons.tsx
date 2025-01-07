import { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Bold, Italic, Strikethrough } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolbarButtonsProps {
  editor: Editor | null
}

export function ToolbarButtons({ editor }: ToolbarButtonsProps) {
  return (
    <div className="flex gap-1 px-[1px] py-1 bg-zinc-50/30">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 w-8 p-0 hover:bg-transparent',
          editor?.isActive('bold') && 'text-primary'
        )}
        onClick={() => editor?.chain().focus().toggleBold().run()}
      >
        <Bold className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 w-8 p-0 hover:bg-transparent',
          editor?.isActive('italic') && 'text-primary'
        )}
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      >
        <Italic className="w-4 h-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-8 w-8 p-0 hover:bg-transparent',
          editor?.isActive('strike') && 'text-primary'
        )}
        onClick={() => editor?.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="w-4 h-4" />
      </Button>
    </div>
  )
}
