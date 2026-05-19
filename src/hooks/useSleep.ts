'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { SleepEntry } from '@/lib/types'
import { addDays, today } from '@/lib/utils'

export function useSleep() {
  const [entries, setEntries] = useState<SleepEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchEntries = useCallback(async (days = 30) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const start = addDays(today(), -days)
    const { data } = await supabase
      .from('sleep_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', start)
      .order('date', { ascending: false })
    setEntries(data ?? [])
    setLoading(false)
  }, [])

  const upsertEntry = useCallback(async (entry: Partial<SleepEntry> & { date: string }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('sleep_entries').upsert(
      { ...entry, user_id: user.id },
      { onConflict: 'user_id,date' }
    )
    await fetchEntries()
  }, [fetchEntries])

  const deleteEntry = useCallback(async (id: string) => {
    await supabase.from('sleep_entries').delete().eq('id', id)
    await fetchEntries()
  }, [fetchEntries])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  return { entries, loading, upsertEntry, deleteEntry, refetch: fetchEntries }
}
