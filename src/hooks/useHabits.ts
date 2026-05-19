'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Habit, HabitEntry } from '@/lib/types'
import { today } from '@/lib/utils'

export function useHabits() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [entries, setEntries] = useState<HabitEntry[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchHabits = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('created_at')
    setHabits(data ?? [])
    setLoading(false)
  }, [])

  const fetchEntries = useCallback(async (startDate: string, endDate: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('habit_entries')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
    setEntries(data ?? [])
  }, [])

  const toggleEntry = useCallback(async (habitId: string, date: string, currentlyCompleted: boolean) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (currentlyCompleted) {
      await supabase.from('habit_entries').delete().eq('habit_id', habitId).eq('date', date)
    } else {
      await supabase.from('habit_entries').upsert({ habit_id: habitId, user_id: user.id, date, completed: true }, { onConflict: 'habit_id,date' })
    }
    await fetchEntries(date, date)
  }, [fetchEntries])

  const addHabit = useCallback(async (name: string, emoji: string, weeklyGoal: number) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('habits').insert({ user_id: user.id, name, emoji, weekly_goal: weeklyGoal })
    await fetchHabits()
  }, [fetchHabits])

  const deleteHabit = useCallback(async (id: string) => {
    await supabase.from('habits').update({ active: false }).eq('id', id)
    await fetchHabits()
  }, [fetchHabits])

  useEffect(() => {
    fetchHabits()
    const t = today()
    fetchEntries(t, t)
  }, [fetchHabits, fetchEntries])

  return { habits, entries, loading, fetchEntries, toggleEntry, addHabit, deleteHabit, refetch: fetchHabits }
}
