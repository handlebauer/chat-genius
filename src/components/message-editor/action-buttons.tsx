import { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { Send, Paperclip } from 'lucide-react'

interface ActionButtonsProps {
  editor: Editor | null
  onSend: () => void
}

export function ActionButtons({ editor, onSend }: ActionButtonsProps) {
  return (
    <div className="flex justify-between pl-[1px] pr-2 py-1 bg-zinc-50/30">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 hover:bg-transparent text-muted-foreground hover:text-primary"
      >
        <Paperclip className="w-4 h-4" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        className="shrink-0 h-8 w-8 p-0 hover:bg-transparent text-muted-foreground disabled:opacity-30 hover:text-primary disabled:bg-transparent"
        disabled={!editor || editor.isEmpty}
        onClick={onSend}
      >
        <Send className="w-4 h-4 text-gray-700" />
      </Button>
    </div>
  )
}
