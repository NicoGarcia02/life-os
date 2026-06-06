'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { CalendarEvent } from '@/lib/types'
import { useRefetchOnFocus } from './useRefetchOnFocus'

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const lastRangeRef = useRef<{ start: string; end: string } | null>(null)

  const fetchEvents = useCallback(async (startDate: string, endDate: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    lastRangeRef.current = { start: startDate, end: endDate }

    // Non-recurring events in range
    const { data: nonRecurring } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .eq('recurring', false)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
      .order('time', { nullsFirst: true })

    // All recurring events (started on or before end of range)
    const { data: recurring } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .eq('recurring', true)
      .lte('date', endDate)
      .order('date')

    setEvents([...(nonRecurring ?? []), ...(recurring ?? [])])
    setLoading(false)
  }, [])

  const addEvent = useCallback(async (event: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'No autenticado'
    const { error } = await supabase.from('events').insert({ ...event, user_id: user.id })
    if (error) { console.error('[calendar] insert error:', error.message, error.details); return error.message }
    const [y, m] = event.date.split('-').map(Number)
    const start = `${y}-${String(m).padStart(2, '0')}-01`
    const last = new Date(y, m, 0)
    const end = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
    await fetchEvents(start, end)
    return null
  }, [fetchEvents])

  const updateEvent = useCallback(async (id: string, updates: Partial<Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>>): Promise<string | null> => {
    const { error } = await supabase.from('events').update(updates).eq('id', id)
    if (error) { console.error('[calendar] update error:', error.message); return error.message }
    if (lastRangeRef.current) {
      await fetchEvents(lastRangeRef.current.start, lastRangeRef.current.end)
    } else {
      const { data } = await supabase.from('events').select('*').eq('id', id).single()
      if (data) setEvents(prev => prev.map(e => e.id === id ? data : e))
    }
    return null
  }, [fetchEvents])

  const deleteEvent = useCallback(async (id: string) => {
    await supabase.from('events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }, [])

  const refetchCurrent = useCallback(() => {
    if (lastRangeRef.current) {
      fetchEvents(lastRangeRef.current.start, lastRangeRef.current.end)
    }
  }, [fetchEvents])

  useEffect(() => {
    const now = new Date()
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const end = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
    fetchEvents(start, end)
  }, [fetchEvents])

  useRefetchOnFocus(refetchCurrent)

  return { events, loading, fetchEvents, addEvent, updateEvent, deleteEvent }
}
