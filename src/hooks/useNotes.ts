'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Note } from '@/lib/types'
import { useRefetchOnFocus } from './useRefetchOnFocus'

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchNotes = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id)
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false })
    setNotes(data ?? [])
    setLoading(false)
  }, [])

  const upsertNote = useCallback(async (note: Partial<Note> & { title: string }): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'No autenticado'
    const now = new Date().toISOString()
    if (note.id) {
      const { error } = await supabase.from('notes').update({ ...note, updated_at: now }).eq('id', note.id)
      if (error) { console.error('[notes] update error:', error.message, error.details); return error.message }
    } else {
      const { error } = await supabase.from('notes').insert({ ...note, user_id: user.id, updated_at: now })
      if (error) { console.error('[notes] insert error:', error.message, error.details); return error.message }
    }
    await fetchNotes()
    return null
  }, [fetchNotes])

  const deleteNote = useCallback(async (id: string) => {
    await supabase.from('notes').delete().eq('id', id)
    await fetchNotes()
  }, [fetchNotes])

  const togglePin = useCallback(async (id: string, pinned: boolean) => {
    await supabase.from('notes').update({ pinned }).eq('id', id)
    await fetchNotes()
  }, [fetchNotes])

  useEffect(() => { fetchNotes() }, [fetchNotes])
  useRefetchOnFocus(fetchNotes)

  return { notes, loading, upsertNote, deleteNote, togglePin, refetch: fetchNotes }
}
