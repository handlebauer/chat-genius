import { useEffect, useMemo, useRef, useState } from 'react'
import { ChannelMember } from '@/hooks/use-chat-data'

interface MemberListProps {
    isOpen: boolean
    onSelect: (member: ChannelMember) => void
    searchText: string
    members: ChannelMember[]
}

function highlightMatch(text: string, query: string) {
    if (!query) return text
    const index = text.toLowerCase().indexOf(query.toLowerCase())
    if (index === -1) return text

    return (
        <>
            {text.slice(0, index)}
            <span className="font-semibold bg-yellow-100/50">
                {text.slice(index, index + query.length)}
            </span>
            {text.slice(index + query.length)}
        </>
    )
}

export function MemberList({
    isOpen,
    onSelect,
    searchText,
    members,
}: MemberListProps) {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const listRef = useRef<HTMLUListElement>(null)

    // Filter members based on input (remove @ symbol from search)
    const query = searchText.slice(1)
    const filteredMembers = useMemo(() => {
        const filtered = members.filter(member => {
            const displayName = member.name || member.email.split('@')[0]
            return displayName.toLowerCase().includes(query.toLowerCase())
        })
        return filtered
    }, [members, query])

    // Reset selection when filtered list changes
    useEffect(() => {
        setSelectedIndex(0)
    }, [searchText])

    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                e.stopPropagation()
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : filteredMembers.length - 1,
                )
            } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                e.stopPropagation()
                setSelectedIndex(prev =>
                    prev < filteredMembers.length - 1 ? prev + 1 : 0,
                )
            } else if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                if (filteredMembers.length > 0) {
                    onSelect(filteredMembers[selectedIndex])
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown, true)
        return () => window.removeEventListener('keydown', handleKeyDown, true)
    }, [selectedIndex, onSelect, isOpen, filteredMembers])

    useEffect(() => {
        if (listRef.current) {
            const selectedItem = listRef.current.children[
                selectedIndex
            ] as HTMLLIElement
            if (selectedItem) {
                selectedItem.scrollIntoView({ block: 'nearest' })
            }
        }
    }, [selectedIndex])

    if (!isOpen || filteredMembers.length === 0) return null

    return (
        <div className="absolute bg-white bottom-full left-0 right-0 mb-1 bg-popover rounded-md border shadow-md">
            <ul ref={listRef} className="max-h-[200px] overflow-y-auto py-0.5">
                {filteredMembers.map((member, index) => {
                    const displayName =
                        member.name || member.email.split('@')[0]
                    return (
                        <li
                            key={member.id}
                            className={`px-3 py-1.5 cursor-pointer text-sm transition-colors hover:bg-zinc-100 ${
                                index === selectedIndex ? 'bg-zinc-100' : ''
                            }`}
                            onClick={() => onSelect(member)}
                            onMouseEnter={() => setSelectedIndex(index)}
                        >
                            {highlightMatch(displayName, query)}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
