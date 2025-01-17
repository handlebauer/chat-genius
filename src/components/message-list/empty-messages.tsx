import { MessageCircle } from 'lucide-react'

interface EmptyMessagesProps {}

export function EmptyMessages({}: EmptyMessagesProps) {
    return (
        <div className="p-4">
            <div className="flex items-start gap-3 text-zinc-500 px-1">
                <div className="bg-zinc-100 p-2 rounded-full shrink-0">
                    <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-sm font-medium text-zinc-600">
                        Welcome to the conversation
                    </p>
                    <p className="text-sm mt-0.5">
                        This is the start of the chat. Send a message to begin!
                    </p>
                </div>
            </div>
        </div>
    )
}
