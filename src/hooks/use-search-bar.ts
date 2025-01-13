import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDebounce } from 'use-debounce'
import { useStore } from '@/lib/store'
import useEvent from '@react-hook/event'

import { searchMessages } from '@/lib/actions/search-messages'

interface UseKeyboardNavigationProps<T> {
    items: T[] | undefined
    isVisible: boolean
    onSelect: (item: T) => void
    onClose: () => void
}

export function useKeyboardNavigation<T>({
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

export interface SearchResult {
    messages: Array<{
        id: string
        content: string
        created_at: string | null
        channel_id: string | null
        sender: {
            id: string
            name: string | null // Changed from string to string | null
            avatar_url?: string | null
            email: string
            created_at: string | null
            updated_at: string | null
            status: string | null
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

export function useSearchBar() {
    const router = useRouter()
    const searchBarRef = useRef<HTMLInputElement>(null)
    const [query, setQuery] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [shouldShowResults, setShouldShowResults] = useState(false)
    const [results, setResults] = useState<SearchResult | null>(null)
    const [debouncedQuery] = useDebounce(query, 300)

    const selectMessage = useStore(state => state.selectMessage)
    const setActiveChannelId = useStore(state => state.setActiveChannelId)

    const handleClose = () => {
        setShouldShowResults(false)
        searchBarRef.current?.blur()
    }

    const handleMessageSelect = async (
        message: SearchResult['messages'][0],
    ) => {
        setActiveChannelId(message.channel_id)
        selectMessage(message.id)
        setShouldShowResults(false)
        setQuery('')
        searchBarRef.current?.blur()
        router.push(`/chat/${message.channel_id}`)
    }

    // Cmd+K shortcut listener
    useEvent(
        typeof window !== 'undefined' ? window : null,
        'keydown',
        (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                searchBarRef.current?.focus()
                setShouldShowResults(true)
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

    useEffect(() => {
        async function performSearch() {
            if (!debouncedQuery.trim()) {
                setResults(null)
                setShouldShowResults(false)
                return
            }

            setIsLoading(true)
            try {
                const result = await searchMessages({
                    query: debouncedQuery,
                    limit: 5,
                })
                setResults(result)
                setShouldShowResults(true)
            } catch (error) {
                console.error('Search failed:', error)
            } finally {
                setIsLoading(false)
            }
        }

        performSearch()
    }, [debouncedQuery])

    return {
        searchBarRef,
        query,
        setQuery,
        isLoading,
        shouldShowResults,
        setShouldShowResults,
        results,
        setResults,
        handleMessageSelect,
        handleClose,
    }
}
