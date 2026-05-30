'use client'
import { useEffect } from 'react'

export function useRefetchOnFocus(refetch: () => void) {
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refetch()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [refetch])
}
