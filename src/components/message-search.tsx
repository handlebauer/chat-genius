'use client'

import { useEffect, useRef, useState } from 'react'
import { useDebounce } from 'use-debounce'
import useEvent from '@react-hook/event'
import { Search, Loader2 } from 'lucide-react'
import { searchMessages } from '@/lib/actions'
import { useStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { SearchResults } from './search-results'

export interface SearchResult {
    messages: Array<{
        id: string
        content: string
        created_at: string | null
        channel_id: string | null
        sender: {
            id: string
            name: string
            avatar_url?: string | null
        }
        channel: {
            name: string
            type: string
        }
        rank: number
    }>
    total: number
    hasMore: boolean
}

interface UseKeyboardNavigationProps<T> {
    items: T[] | undefined
    isVisible: boolean
    onSelect: (item: T) => void
    onClose: () => void
}

function useKeyboardNavigation<T>({
    items,
    isVisible,
    onSelect,
    onClose,
}: UseKeyboardNavigationProps<T>) {
    const [selectedIndex, setSelectedIndex] = useState(-1)

    // Reset selected index when items change
    useEffect(() => {
        setSelectedIndex(items?.length ? 0 : -1)
    }, [items])

    // Handle keyboard navigation
    useEvent(
        typeof window !== 'undefined' ? window : null,
        'keydown',
        (e: KeyboardEvent) => {
            if (!isVisible || !items?.length) return

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault()
                    setSelectedIndex(prev =>
                        prev < items.length - 1 ? prev + 1 : prev,
                    )
                    break
                case 'ArrowUp':
                    e.preventDefault()
                    setSelectedIndex(prev => (prev > -1 ? prev - 1 : prev))
                    break
                case 'Enter':
                    e.preventDefault()
                    if (selectedIndex >= 0 && items[selectedIndex]) {
                        onSelect(items[selectedIndex])
                    }
                    break
                case 'Escape':
                    e.preventDefault()
                    onClose()
                    setSelectedIndex(-1)
                    break
            }
        },
    )

    return {
        selectedIndex,
        setSelectedIndex,
    }
}

export function MessageSearch() {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResult | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    const { selectMessage, setActiveChannelId } = useStore()

    const handleMessageSelect = async (
        message: SearchResult['messages'][0],
    ) => {
        setActiveChannelId(message.channel_id)
        router.push(`/chat/${message.channel_id}`)
        selectMessage(message.id)
        setShowResults(false)
        setQuery('')
        inputRef.current?.blur()
    }

    const handleClose = () => {
        setShowResults(false)
        inputRef.current?.blur()
    }

    const { selectedIndex, setSelectedIndex } = useKeyboardNavigation({
        items: results?.messages,
        isVisible: showResults,
        onSelect: handleMessageSelect,
        onClose: handleClose,
    })

    // Cmd+K shortcut listener
    useEvent(
        typeof window !== 'undefined' ? window : null,
        'keydown',
        (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                inputRef.current?.focus()
                setShowResults(true)
            }
        },
    )

    // Handle click outside
    useEvent(
        typeof window !== 'undefined' ? window : null,
        'click',
        (e: MouseEvent) => {
            const target = e.target as HTMLElement
            if (!target.closest('.search-container')) {
                handleClose()
            }
        },
    )

    // Debounce the search query
    const [debouncedQuery] = useDebounce(query, 300)

    // Perform search when debounced query changes
    useEffect(() => {
        async function performSearch() {
            if (!debouncedQuery.trim()) {
                setResults(null)
                setShowResults(false)
                return
            }

            setIsLoading(true)
            try {
                const result = await searchMessages({
                    query: debouncedQuery,
                    limit: 5,
                })
                setResults(result)
                setShowResults(true)
            } catch (error) {
                console.error('Search failed:', error)
            } finally {
                setIsLoading(false)
            }
        }

        performSearch()
    }, [debouncedQuery])

    return (
        <div className="relative search-container">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => setShowResults(true)}
                    placeholder="Search (⌘K)"
                    className="w-[180px] rounded-lg border border-input bg-background/80 py-2 pl-10 pr-10 text-sm outline-none transition-all duration-200 hover:bg-background focus:w-[300px] focus:bg-background focus:border-zinc-400"
                />
                {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 animate-spin" />
                )}
            </div>

            {showResults && (query.trim() || isLoading) && (
                <div className="absolute right-0 mt-1 w-[300px] rounded-md border border-zinc-200 bg-white shadow-lg z-50">
                    <div className="max-h-96 overflow-auto py-1">
                        <SearchResults
                            results={results}
                            isLoading={isLoading}
                            query={query}
                            selectedIndex={selectedIndex}
                            onSelect={handleMessageSelect}
                            onHover={setSelectedIndex}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}
