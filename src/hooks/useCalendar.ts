'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { CalendarEvent } from '@/lib/types'

export function useCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchEvents = useCallback(async (startDate: string, endDate: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
      .order('time', { nullsFirst: true })
    setEvents(data ?? [])
    setLoading(false)
  }, [])

  const addEvent = useCallback(async (event: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('events').insert({ ...event, user_id: user.id })
    const d = new Date(event.date)
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
    await fetchEvents(start, end)
  }, [fetchEvents])

  const deleteEvent = useCallback(async (id: string) => {
    await supabase.from('events').delete().eq('id', id)
  }, [])

  useEffect(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
    fetchEvents(start, end)
  }, [fetchEvents])

  return { events, loading, fetchEvents, addEvent, deleteEvent }
}
