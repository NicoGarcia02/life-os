'use client'
import { useEffect, useRef, useCallback } from 'react'
import type { CalendarEvent } from '@/lib/types'

export type NotifIntensity = 'silent' | 'normal' | 'urgent'
const INTENSITY_KEY = 'notif_intensity'

export function getStoredIntensity(): NotifIntensity {
  if (typeof window === 'undefined') return 'normal'
  return (localStorage.getItem(INTENSITY_KEY) as NotifIntensity) ?? 'normal'
}

export function storeIntensity(v: NotifIntensity) {
  localStorage.setItem(INTENSITY_KEY, v)
}

export function useNotifications() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    return () => { timers.current.forEach(clearTimeout) }
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    const perm = await Notification.requestPermission()
    return perm === 'granted'
  }, [])

  const schedule = useCallback(async (events: CalendarEvent[]) => {
    timers.current.forEach(clearTimeout)
    timers.current = []

    const granted = await requestPermission()
    if (!granted) return

    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.ready : null
    const intensity = getStoredIntensity()
    const now = Date.now()

    for (const ev of events) {
      if (!ev.notify || !ev.time) continue

      const eventMs = new Date(`${ev.date}T${ev.time}`).getTime()
      const delay = eventMs - (ev.notify_minutes_before ?? 15) * 60_000 - now

      if (delay < 0 || delay > 48 * 60 * 60_000) continue

      const timer = setTimeout(async () => {
        const opts: NotificationOptions = {
          body: `${ev.time!.slice(0, 5)}${ev.duration ? ` · ${ev.duration} min` : ''} · ${ev.tag}`,
          tag: `${ev.id}-${ev.date}`,
          silent: intensity === 'silent',
          requireInteraction: intensity === 'urgent',
        }
        try {
          if (reg) await reg.showNotification(ev.title, opts)
          else new Notification(ev.title, opts)
        } catch {
          try { new Notification(ev.title, opts) } catch { /* unsupported */ }
        }
      }, delay)

      timers.current.push(timer)
    }
  }, [requestPermission])

  return { schedule, requestPermission }
}
