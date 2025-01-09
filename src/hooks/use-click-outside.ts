'use client'

import { useEffect, useRef } from 'react'

interface UseClickOutsideProps {
  onClickOutside: () => void
  enabled?: boolean
}

export function useClickOutside<T extends HTMLElement>({ onClickOutside, enabled = true }: UseClickOutsideProps) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (!enabled) return

    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickOutside()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClickOutside, enabled])

  return ref
}
