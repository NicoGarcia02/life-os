'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Note } from '@/lib/types'

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
      .order('updated_at', { ascending: false })
    setNotes(data ?? [])
    setLoading(false)
  }, [])

  const upsertNote = useCallback(async (note: Partial<Note> & { title: string }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (note.id) {
      await supabase.from('notes').update({ ...note, updated_at: new Date().toISOString() }).eq('id', note.id)
    } else {
      await supabase.from('notes').insert({ ...note, user_id: user.id })
    }
    await fetchNotes()
  }, [fetchNotes])

  const deleteNote = useCallback(async (id: string) => {
    await supabase.from('notes').delete().eq('id', id)
    await fetchNotes()
  }, [fetchNotes])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  return { notes, loading, upsertNote, deleteNote, refetch: fetchNotes }
}
