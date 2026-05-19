'use client'
import { useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { DailyClosing, SleepEntry } from '@/lib/types'

export function useDailyClosing() {
  const supabase = createClient()

  const getClosing = useCallback(async (date: string): Promise<DailyClosing | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('daily_closings')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .single()
    return data
  }, [])

  const saveClosing = useCallback(async (date: string, dayRating: number, journal: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('daily_closings').upsert(
      { user_id: user.id, date, day_rating: dayRating, journal },
      { onConflict: 'user_id,date' }
    )
  }, [])

  const saveSleepForClosing = useCallback(async (entry: Partial<SleepEntry> & { date: string }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('sleep_entries').upsert(
      { ...entry, user_id: user.id },
      { onConflict: 'user_id,date' }
    )
  }, [])

  const getSleepEntry = useCallback(async (date: string): Promise<SleepEntry | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('sleep_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .single()
    return data
  }, [])

  const getClosingsForRange = useCallback(async (start: string, end: string): Promise<DailyClosing[]> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data } = await supabase
      .from('daily_closings')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .order('date')
    return data ?? []
  }, [])

  return { getClosing, saveClosing, saveSleepForClosing, getSleepEntry, getClosingsForRange }
}
