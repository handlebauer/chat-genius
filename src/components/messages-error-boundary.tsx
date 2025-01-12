'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { FallbackProps } from 'react-error-boundary'

export function MessagesErrorBoundary({
    error,
    resetErrorBoundary,
}: FallbackProps) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Messages error:', error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center flex-1 p-4 space-y-4 text-center">
            <AlertCircle className="w-10 h-10 text-red-500" />
            <div className="space-y-2">
                <h3 className="text-lg font-medium">
                    Something went wrong loading messages
                </h3>
                <p className="text-sm text-zinc-500">
                    There was a problem loading the messages for this channel.
                </p>
            </div>
            <button
                onClick={resetErrorBoundary}
                className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 rounded-md hover:bg-zinc-800"
            >
                Try again
            </button>
        </div>
    )
}
