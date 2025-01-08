'use client';

import { useEffect, useRef, useState } from 'react';
import { useDebounce } from 'use-debounce';
import useEvent from '@react-hook/event';
import { Search, Loader2 } from 'lucide-react';
import { searchMessages } from '@/lib/actions';
import { useStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

interface SearchResult {
  messages: Array<{
    id: string;
    content: string;
    created_at: string;
    channel_id: string;
    sender: {
      id: string;
      name: string;
      avatar_url?: string | null;
    };
    channel: {
      name: string;
      type: string;
    };
    rank: number;
  }>;
  total: number;
  hasMore: boolean;
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripHtml(html: string): string {
  // First replace common block elements with spaces to preserve readability
  const withLineBreaks = html.replace(/<\/(p|div|br)>/gi, ' ');
  // Strip all remaining HTML tags
  const stripped = withLineBreaks.replace(/<[^>]+>/g, '');
  // Normalize whitespace (convert multiple spaces to single space)
  const normalized = stripped.replace(/\s+/g, ' ');
  // Decode HTML entities
  const decoded = normalized.replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return decoded.trim();
}

function highlightText(text: string, query: string) {
  if (!query.trim()) {
    return stripHtml(text);
  }

  // First strip HTML from the text
  const strippedText = stripHtml(text);

  // Split query into words and create a regex that matches any of them
  const words = query.trim().split(/\s+/);
  const regex = new RegExp(`(${words.map(word => escapeRegExp(word)).join('|')})`, 'gi');

  return strippedText.split(regex).map((part, i) =>
    regex.test(part) ? (
      <span key={i} className="bg-yellow-200 rounded-sm">{part}</span>
    ) : (
      part
    )
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'long' });
  } else {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
}

export function MessageSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { selectMessage, setActiveChannelId } = useStore();

  // Debounce the search query
  const [debouncedQuery] = useDebounce(query, 300);

  // Add keyboard shortcut listener
  useEvent(window, 'keydown', (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      inputRef.current?.focus();
      setShowResults(true);
    }
    if (e.key === 'Escape') {
      setShowResults(false);
      inputRef.current?.blur();
    }
  });

  // Handle click outside
  useEvent(window, 'click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.search-container')) {
      setShowResults(false);
    }
  });

  // Perform search when debounced query changes
  useEffect(() => {
    async function performSearch() {
      if (!debouncedQuery.trim()) {
        setResults(null);
        setShowResults(false);
        return;
      }

      setIsLoading(true);
      try {
        const result = await searchMessages({
          query: debouncedQuery,
          limit: 5
        });
        setResults(result);
        setShowResults(true);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    }

    performSearch();
  }, [debouncedQuery]);

  const handleMessageSelect = async (message: SearchResult['messages'][0]) => {
    // First, switch to the correct channel if needed
    setActiveChannelId(message.channel_id);
    router.push(`/chat/${message.channel_id}`);

    // Set the selected message to trigger scrolling and highlighting
    selectMessage(message.id);

    // Close the search results
    setShowResults(false);
    setQuery('');
    inputRef.current?.blur();
  };

  return (
    <div className="relative search-container">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          placeholder="Search (⌘K)"
          className="w-[180px] rounded-lg border border-input bg-background/80 py-2 pl-10 pr-10 text-sm outline-none transition-all duration-200 hover:bg-background focus:w-[300px] focus:bg-background focus:border-zinc-400"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Results dropdown */}
      {showResults && (query.trim() || isLoading) && (
        <div className="absolute right-0 mt-1 w-[300px] rounded-md border border-zinc-200 bg-white shadow-lg z-50">
          <div className="max-h-96 overflow-auto py-1">
            {isLoading ? (
              <div className="px-4 py-2 text-sm text-gray-500">Searching...</div>
            ) : results?.messages.length ? (
              results.messages.map((message) => (
                <button
                  key={message.id}
                  onClick={() => handleMessageSelect(message)}
                  className="w-full px-4 py-3 text-left hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none border-b border-zinc-100 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {highlightText(message.sender.name, query)}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {message.channel.type === 'direct_message' ? '@' : '#'}
                        {message.channel.name}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400">
                      {formatDate(message.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600 line-clamp-2">
                    {highlightText(message.content, query)}
                  </p>
                </button>
              ))
            ) : query.trim() ? (
              <div className="px-4 py-2 text-sm text-gray-500">No results found</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

