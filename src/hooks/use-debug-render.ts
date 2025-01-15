import { useEffect, useRef } from 'react'

export function useDebugRender(
    componentName: string,
    props: Record<string, any>,
) {
    const renderCount = useRef(0)
    const previousProps = useRef<Record<string, any>>({})
    const isFirstRender = useRef(true)

    useEffect(() => {
        renderCount.current += 1

        if (isFirstRender.current) {
            console.group(
                `[${componentName}] Initial Render #${renderCount.current}`,
            )
            console.log('Initial props:', props)
            console.groupEnd()
            isFirstRender.current = false
            previousProps.current = props
            return
        }

        const changedProps: Record<string, { previous: any; current: any }> = {}
        let hasChanges = false

        Object.entries(props).forEach(([key, value]) => {
            if (previousProps.current[key] !== value) {
                hasChanges = true
                changedProps[key] = {
                    previous: previousProps.current[key],
                    current: value,
                }
            }
        })

        if (hasChanges) {
            console.group(
                `[${componentName}] Re-render #${renderCount.current}`,
            )
            console.log('Changed props:', changedProps)
            console.groupEnd()
        } else {
            console.log(
                `[${componentName}] Re-render #${renderCount.current} (no prop changes)`,
            )
        }

        previousProps.current = { ...props }
    })
}
