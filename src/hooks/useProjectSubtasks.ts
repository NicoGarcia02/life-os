'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { ProjectSubtask } from '@/lib/types'

export function useProjectSubtasks(taskId: string) {
  const [subtasks, setSubtasks] = useState<ProjectSubtask[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchSubtasks = useCallback(async () => {
    if (!taskId) return
    const { data } = await supabase
      .from('project_subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at')
    setSubtasks(data ?? [])
    setLoading(false)
  }, [taskId])

  const addSubtask = useCallback(async (title: string): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'No autenticado'
    const { error } = await supabase.from('project_subtasks').insert({
      task_id: taskId, user_id: user.id, title, completed: false,
    })
    if (error) return error.message
    await fetchSubtasks()
    return null
  }, [taskId, fetchSubtasks])

  const toggleSubtask = useCallback(async (id: string, completed: boolean) => {
    await supabase.from('project_subtasks').update({ completed: !completed }).eq('id', id)
    await fetchSubtasks()
  }, [fetchSubtasks])

  const deleteSubtask = useCallback(async (id: string) => {
    await supabase.from('project_subtasks').delete().eq('id', id)
    await fetchSubtasks()
  }, [fetchSubtasks])

  useEffect(() => { fetchSubtasks() }, [fetchSubtasks])

  return { subtasks, loading, addSubtask, toggleSubtask, deleteSubtask }
}
