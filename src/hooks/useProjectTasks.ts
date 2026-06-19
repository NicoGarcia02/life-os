'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { ProjectTask } from '@/lib/types'

export function useProjectTasks(projectId: string) {
  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('project_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at')
    setTasks(data ?? [])
    setLoading(false)
  }, [projectId])

  const addTask = useCallback(async (title: string): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'No autenticado'
    const { error } = await supabase.from('project_tasks').insert({
      project_id: projectId, user_id: user.id, title, status: 'pendiente',
    })
    if (error) return error.message
    await fetchTasks()
    return null
  }, [projectId, fetchTasks])

  const cycleStatus = useCallback(async (id: string, current: ProjectTask['status']) => {
    const next: Record<ProjectTask['status'], ProjectTask['status']> = {
      pendiente: 'en_curso', en_curso: 'listo', listo: 'pendiente',
    }
    await supabase.from('project_tasks').update({ status: next[current] }).eq('id', id)
    await fetchTasks()
  }, [fetchTasks])

  const updateTask = useCallback(async (id: string, updates: { title?: string; description?: string }) => {
    await supabase.from('project_tasks').update(updates).eq('id', id)
    await fetchTasks()
  }, [fetchTasks])

  const deleteTask = useCallback(async (id: string) => {
    await supabase.from('project_tasks').delete().eq('id', id)
    await fetchTasks()
  }, [fetchTasks])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  return { tasks, loading, addTask, cycleStatus, updateTask, deleteTask }
}
