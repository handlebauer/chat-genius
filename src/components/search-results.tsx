import { formatDate } from '@/lib/utils';

export interface SearchResult {
  messages: Array<{
    id: string;
    content: string;
    created_at: string | null;
    channel_id: string | null;
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

interface SearchResultsProps {
  results: SearchResult | null;
  isLoading: boolean;
  query: string;
  selectedIndex: number;
  onSelect: (message: SearchResult['messages'][0]) => void;
  onHover: (index: number) => void;
}

export function SearchResults({
  results,
  isLoading,
  query,
  selectedIndex,
  onSelect,
  onHover
}: SearchResultsProps) {
  if (isLoading) {
    return <div className="px-4 py-2 text-sm text-gray-500">Searching...</div>;
  }

  if (!results?.messages.length) {
    return query.trim() ? (
      <div className="px-4 py-2 text-sm text-gray-500">No results found</div>
    ) : null;
  }

  return (
    <>
      {results.messages.map((message: SearchResult['messages'][0], index: number) => (
        <button
          key={message.id}
          onClick={() => onSelect(message)}
          className={`w-full px-4 py-3 text-left hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none border-b border-zinc-100 last:border-0 ${
            index === selectedIndex ? 'bg-zinc-100' : ''
          }`}
          onMouseEnter={() => onHover(index)}
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
              {message.created_at ? formatDate(message.created_at) : 'Unknown Date'}
            </span>
          </div>
          <p className="text-sm text-zinc-600 line-clamp-2">
            {highlightText(message.content, query)}
          </p>
        </button>
      ))}
    </>
  );
}
