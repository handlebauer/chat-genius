import { cn } from '@/lib/utils'

interface Reaction {
  emoji: string
  count: number
  hasReacted: boolean
}

interface MessageReactionsProps {
  reactions?: Reaction[]
  onReactionClick?: (emoji: string) => void
}

export function MessageReactions({ reactions, onReactionClick }: MessageReactionsProps) {
  if (!reactions?.length || !onReactionClick) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-1">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => onReactionClick(reaction.emoji)}
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
            reaction.hasReacted
              ? "bg-zinc-200 border border-zinc-300 hover:bg-zinc-300"
              : "bg-transparent border border-zinc-200 hover:bg-zinc-50"
          )}
        >
          <span>{reaction.emoji}</span>
          <span className={cn(
            "text-zinc-600",
            reaction.hasReacted && "text-zinc-700"
          )}>{reaction.count}</span>
        </button>
      ))}
    </div>
  )
}

