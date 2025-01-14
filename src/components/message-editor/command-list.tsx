import { useEffect, useRef, useState } from 'react'

interface CommandListProps {
    isOpen: boolean
    onSelect: (command: string) => void
    commandText: string
}

const commands = [
    {
        id: 'ask',
        name: '/ask',
        description: 'Get an answer to a question',
        args: [
            {
                name: 'question',
                placeholder: 'what is the question',
                required: true,
            },
        ],
    },
    {
        id: 'dummy',
        name: '/dummy',
        description: 'A dummy command for testing',
        args: [
            {
                name: 'test',
                placeholder: 'test input here',
                required: true,
            },
        ],
    },
]

function highlightMatch(text: string, query: string) {
    if (!query || query === '/') return text

    const matchStart = text.toLowerCase().indexOf(query.toLowerCase())
    if (matchStart === -1) return text

    const beforeMatch = text.slice(0, matchStart)
    const match = text.slice(matchStart, matchStart + query.length)
    const afterMatch = text.slice(matchStart + query.length)

    return (
        <>
            {beforeMatch}
            <span className="font-bold">{match}</span>
            {afterMatch}
        </>
    )
}

export function CommandList({
    isOpen,
    onSelect,
    commandText,
}: CommandListProps) {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const listRef = useRef<HTMLUListElement>(null)

    // Filter commands based on input
    const filteredCommands = commands.filter(cmd =>
        cmd.name.toLowerCase().startsWith(commandText.toLowerCase()),
    )

    // Reset selection when filtered list changes
    useEffect(() => {
        setSelectedIndex(0)
    }, [commandText])

    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                e.stopPropagation()
                setSelectedIndex(prev =>
                    prev > 0 ? prev - 1 : filteredCommands.length - 1,
                )
            } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                e.stopPropagation()
                setSelectedIndex(prev =>
                    prev < filteredCommands.length - 1 ? prev + 1 : 0,
                )
            } else if (e.key === 'Tab' || e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                if (filteredCommands.length > 0) {
                    onSelect(filteredCommands[selectedIndex].id)
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown, true)
        return () => window.removeEventListener('keydown', handleKeyDown, true)
    }, [selectedIndex, onSelect, isOpen, filteredCommands])

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

    if (!isOpen || filteredCommands.length === 0) return null

    return (
        <div className="absolute bg-white bottom-full left-0 right-0 mb-1 bg-popover rounded-md border shadow-md">
            <ul ref={listRef} className="max-h-[300px] overflow-y-auto py-1">
                {filteredCommands.map((command, index) => (
                    <li
                        key={command.id}
                        className={`px-3 py-2 cursor-pointer transition-colors hover:bg-zinc-100 ${
                            index === selectedIndex ? 'bg-zinc-100' : ''
                        }`}
                        onClick={() => onSelect(command.id)}
                        onMouseEnter={() => setSelectedIndex(index)}
                    >
                        <div className="flex-1 space-y-1">
                            <div className="text-sm font-medium">
                                {highlightMatch(command.name, commandText)}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                                {command.description}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}
