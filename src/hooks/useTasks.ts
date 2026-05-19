'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Task } from '@/lib/types'
import { today } from '@/lib/utils'

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchTasks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setTasks(data ?? [])
    setLoading(false)
  }, [])

  const addTask = useCallback(async (task: Pick<Task, 'title' | 'description' | 'priority' | 'due_date'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('tasks').insert({ ...task, user_id: user.id })
    await fetchTasks()
  }, [fetchTasks])

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    await supabase.from('tasks').update(updates).eq('id', id)
    await fetchTasks()
  }, [fetchTasks])

  const toggleTask = useCallback(async (id: string, completed: boolean) => {
    await supabase.from('tasks').update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    }).eq('id', id)
    await fetchTasks()
  }, [fetchTasks])

  const deleteTask = useCallback(async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id)
    await fetchTasks()
  }, [fetchTasks])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const t = today()
  const todayTasks = tasks.filter(task => task.due_date === t || (!task.due_date && task.created_at?.startsWith(t)))
  const overdueTasks = tasks.filter(task => !task.completed && task.due_date && task.due_date < t)
  const overduePriority = overdueTasks.filter(t => t.priority === 'alta')

  return { tasks, todayTasks, overdueTasks, overduePriority, loading, addTask, updateTask, toggleTask, deleteTask, refetch: fetchTasks }
}
