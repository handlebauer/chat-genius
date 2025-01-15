'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const IDLE_TIMEOUT = 30000 // 30 seconds
const CHECK_INTERVAL = 5000 // Check every 5 seconds instead of every second
const ACTIVITY_THRESHOLD = 5000 // Minimum time between activity updates

export function useIdleDetection() {
    const [isIdle, setIsIdle] = useState(false)
    const [lastActivity, setLastActivity] = useState(Date.now())

    const handleActivity = useCallback(() => {
        const now = Date.now()
        const timeSinceLastUpdate = now - lastActivity

        // Only update if:
        // 1. User was previously idle OR
        // 2. Significant time has passed since last update
        if (isIdle || timeSinceLastUpdate > ACTIVITY_THRESHOLD) {
            setLastActivity(now)
            if (isIdle) setIsIdle(false)
        }
    }, [isIdle, lastActivity])

    useEffect(() => {
        let activityTimer: ReturnType<typeof setTimeout>
        let isProcessingActivity = false

        const processActivity = () => {
            if (!isProcessingActivity) {
                isProcessingActivity = true
                handleActivity()

                // Reset processing flag after throttle period
                setTimeout(() => {
                    isProcessingActivity = false
                }, 1000)
            }
        }

        // Combine multiple events into a single handler
        const events = ['mousemove', 'keydown', 'touchstart']
        events.forEach(event =>
            window.addEventListener(event, processActivity, { passive: true }),
        )

        // Set up idle check interval
        const checkIdle = () => {
            const now = Date.now()
            if (now - lastActivity >= IDLE_TIMEOUT && !isIdle) {
                setIsIdle(true)
            }
        }

        const intervalId = setInterval(checkIdle, CHECK_INTERVAL)

        return () => {
            events.forEach(event =>
                window.removeEventListener(event, processActivity),
            )
            clearInterval(intervalId)
        }
    }, [handleActivity, isIdle, lastActivity])

    return { isIdle, lastActivity }
}
