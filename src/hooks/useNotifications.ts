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

function playAlarm(ctx: AudioContext) {
  const beep = (t: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.4, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
    osc.start(t)
    osc.stop(t + 0.25)
  }
  const now = ctx.currentTime
  beep(now)
  beep(now + 0.35)
  beep(now + 0.7)
}

export function useNotifications() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const audioCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
    const unlock = () => {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      audioCtxRef.current.resume()
    }
    document.addEventListener('click', unlock, { once: true })
    return () => {
      timers.current.forEach(clearTimeout)
      document.removeEventListener('click', unlock)
    }
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
    const globalIntensity = getStoredIntensity()
    const now = Date.now()

    for (const ev of events) {
      if (!ev.notify || !ev.time) continue

      const eventMs = new Date(`${ev.date}T${ev.time}`).getTime()
      const delay = eventMs - (ev.notify_minutes_before ?? 15) * 60_000 - now

      if (delay < 0 || delay > 48 * 60 * 60_000) continue

      const timer = setTimeout(async () => {
        const intensity = ev.notify_intensity ?? globalIntensity
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
        if (intensity === 'urgent' && audioCtxRef.current) {
          playAlarm(audioCtxRef.current)
        }
      }, delay)

      timers.current.push(timer)
    }
  }, [requestPermission])

  return { schedule, requestPermission }
}
