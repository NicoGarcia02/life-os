'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { ScheduleEntry } from '@/lib/types'

export function useSchedule() {
  const [entries, setEntries] = useState<ScheduleEntry[]>([])
  const supabase = createClient()

  const fetchEntries = useCallback(async (date: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('schedule_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .order('time')
    setEntries(data ?? [])
  }, [])

  const addEntry = useCallback(async (entry: { date: string; time: string; title: string; duration?: number }): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'No autenticado'
    const { error } = await supabase.from('schedule_entries').insert({
      ...entry,
      user_id: user.id,
      duration: entry.duration ?? 60,
    })
    if (error) return error.message
    await fetchEntries(entry.date)
    return null
  }, [fetchEntries])

  const deleteEntry = useCallback(async (id: string) => {
    await supabase.from('schedule_entries').delete().eq('id', id)
    setEntries(prev => prev.filter(e => e.id !== id))
  }, [])

  return { entries, fetchEntries, addEntry, deleteEntry }
}
