'use client'

import { useState, useEffect, useCallback } from 'react'

const IDLE_TIMEOUT = 30000 // 30 seconds

export function useIdleDetection() {
    const [isIdle, setIsIdle] = useState(false)
    const [lastActivity, setLastActivity] = useState(Date.now())

    // Memoize the activity handler to prevent recreating it on each render
    const handleActivity = useCallback(() => {
        setLastActivity(Date.now())
        setIsIdle(false)
    }, [])

    // Memoize the idle check to prevent recreating it on each render
    const checkIdle = useCallback(() => {
        const now = Date.now()
        const timeSinceLastActivity = now - lastActivity

        if (timeSinceLastActivity >= IDLE_TIMEOUT && !isIdle) {
            setIsIdle(true)
        }
    }, [lastActivity, isIdle])

    useEffect(() => {
        let timeoutId: NodeJS.Timeout | undefined

        // Set up event listeners for user activity
        window.addEventListener('mousemove', handleActivity)
        window.addEventListener('mousedown', handleActivity)
        window.addEventListener('keypress', handleActivity)
        window.addEventListener('touchstart', handleActivity)
        window.addEventListener('scroll', handleActivity)

        // Set up interval to check idle status
        const intervalId = setInterval(checkIdle, 1000)

        // Cleanup
        return () => {
            window.removeEventListener('mousemove', handleActivity)
            window.removeEventListener('mousedown', handleActivity)
            window.removeEventListener('keypress', handleActivity)
            window.removeEventListener('touchstart', handleActivity)
            window.removeEventListener('scroll', handleActivity)
            clearInterval(intervalId)
            if (timeoutId) clearTimeout(timeoutId)
        }
    }, [handleActivity, checkIdle]) // Only re-run effect when these callbacks change

    return { isIdle, lastActivity }
}
