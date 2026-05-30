'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { SleepEntry } from '@/lib/types'
import { addDays, today } from '@/lib/utils'
import { useRefetchOnFocus } from './useRefetchOnFocus'

export function useSleep() {
  const [entries, setEntries] = useState<SleepEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchEntries = useCallback(async (days = 60) => {
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

  const upsertEntry = useCallback(async (entry: Partial<SleepEntry> & { date: string }): Promise<string | null> => {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[sleep] auth error:', authError)
      return 'No autenticado. Iniciá sesión nuevamente.'
    }
    const { error } = await supabase.from('sleep_entries').upsert(
      { ...entry, user_id: user.id },
      { onConflict: 'user_id,date' }
    )
    if (error) {
      console.error('[sleep] upsert error:', { message: error.message, details: error.details, hint: error.hint, code: error.code })
      return error.message || 'Error al guardar el registro de sueno'
    }
    await fetchEntries()
    return null
  }, [fetchEntries])

  const deleteEntry = useCallback(async (id: string): Promise<string | null> => {
    const { error } = await supabase.from('sleep_entries').delete().eq('id', id)
    if (error) {
      console.error('[sleep] delete error:', { message: error.message, details: error.details, hint: error.hint, code: error.code })
      return error.message || 'Error al eliminar el registro'
    }
    await fetchEntries()
    return null
  }, [fetchEntries])

  useEffect(() => { fetchEntries(60) }, [fetchEntries])
  useRefetchOnFocus(() => fetchEntries(60))

  return { entries, loading, upsertEntry, deleteEntry, refetch: fetchEntries }
}
