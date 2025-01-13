'use client'

import { Search, Loader2 } from 'lucide-react'
import { SearchResults } from './search-results'
import { useKeyboardNavigation, useSearchBar } from '@/hooks/use-search-bar'

export function MessageSearch() {
    const {
        searchBarRef,
        shouldShowResults,
        query,
        isLoading,
        results,
        setQuery,
        setShouldShowResults,
        handleMessageSelect,
        handleClose,
    } = useSearchBar()

    const { selectedIndex, setSelectedIndex } = useKeyboardNavigation({
        items: results?.messages,
        isVisible: shouldShowResults,
        onSelect: handleMessageSelect,
        onClose: handleClose,
    })

    return (
        <div className="relative search-container">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    ref={searchBarRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => setShouldShowResults(true)}
                    placeholder="Search (⌘K)"
                    className="w-[180px] rounded-lg border border-input bg-background/80 py-2 pl-10 pr-10 text-sm outline-none transition-all duration-200 hover:bg-background focus:w-[300px] focus:bg-background focus:border-zinc-400"
                />
                {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 animate-spin" />
                )}
            </div>

            {shouldShowResults && (query.trim() || isLoading) && (
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
