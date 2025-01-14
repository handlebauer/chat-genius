import { useState, useEffect } from 'react'

interface CommandInputProps {
    commandId: string
    onSubmit: (args: { [key: string]: string }) => void
    onCancel: () => void
}

const commandArgs = {
    ask: [
        {
            name: 'question',
            placeholder: 'what is the question?',
            required: true,
        },
    ],
    dummy: [
        {
            name: 'test',
            placeholder: 'test input here',
            required: true,
        },
    ],
}

export function CommandInput({
    commandId,
    onSubmit,
    onCancel,
}: CommandInputProps) {
    const args = commandArgs[commandId as keyof typeof commandArgs]
    const [values, setValues] = useState<{ [key: string]: string }>({})
    const [showError, setShowError] = useState(false)
    const arg = args[0] // We only handle one argument per command for now

    const inputStyle = {
        width: values[arg.name]
            ? `${Math.max(1, values[arg.name].length)}ch`
            : '1px',
    }

    // Reset error state after animation
    useEffect(() => {
        if (showError) {
            const timer = setTimeout(() => {
                setShowError(false)
            }, 1000)
            return () => clearTimeout(timer)
        }
    }, [showError])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            if (!values[arg.name]?.trim()) {
                setShowError(true)
                return
            }
            onSubmit(values)
        } else if (
            e.key === 'Escape' ||
            (e.key === 'Backspace' && !values[arg.name])
        ) {
            e.preventDefault()
            onCancel()
        } else if (e.key === 'Tab') {
            e.preventDefault()
            if (!values[arg.name]?.trim()) {
                setShowError(true)
            }
        }
    }

    return (
        <div className="command-input">
            <span className="command-input-prefix">/{commandId}</span>
            <div
                className={`command-input-container flex-1 ${
                    showError ? 'error' : ''
                }`}
            >
                <span className="command-input-label">{arg.name}</span>
                <input
                    type="text"
                    className="command-input-field leading-snug pr-[9px] pl-[8px] font-mono box-content m-0 overflow-visible text-left outline-none"
                    style={inputStyle}
                    value={values[arg.name] || ''}
                    onChange={e => {
                        setValues(prev => ({
                            ...prev,
                            [arg.name]: e.target.value,
                        }))
                    }}
                    onKeyDown={handleKeyDown}
                    autoFocus
                />
            </div>
        </div>
    )
}
