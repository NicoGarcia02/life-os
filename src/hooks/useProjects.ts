'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { Project } from '@/lib/types'

export interface ProjectWithStats extends Project {
  taskTotal: number
  taskDone: number
  milestoneCount: number
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchProjects = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [projectsRes, tasksRes, milestonesRes] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('project_tasks').select('project_id, status').eq('user_id', user.id),
      supabase.from('project_milestones').select('project_id').eq('user_id', user.id),
    ])

    const taskMap: Record<string, { total: number; done: number }> = {}
    for (const t of tasksRes.data ?? []) {
      if (!taskMap[t.project_id]) taskMap[t.project_id] = { total: 0, done: 0 }
      taskMap[t.project_id].total++
      if (t.status === 'listo') taskMap[t.project_id].done++
    }

    const milestoneMap: Record<string, number> = {}
    for (const m of milestonesRes.data ?? []) {
      milestoneMap[m.project_id] = (milestoneMap[m.project_id] ?? 0) + 1
    }

    setProjects((projectsRes.data ?? []).map(p => ({
      ...p,
      taskTotal: taskMap[p.id]?.total ?? 0,
      taskDone: taskMap[p.id]?.done ?? 0,
      milestoneCount: milestoneMap[p.id] ?? 0,
    })))
    setLoading(false)
  }, [])

  const createProject = useCallback(async (
    data: Pick<Project, 'name' | 'description' | 'category' | 'status' | 'color' | 'start_date' | 'deadline'>
  ): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'No autenticado'
    const { error } = await supabase.from('projects').insert({ ...data, user_id: user.id })
    if (error) return error.message
    await fetchProjects()
    return null
  }, [fetchProjects])

  const updateProject = useCallback(async (id: string, updates: Partial<Project>): Promise<string | null> => {
    const { error } = await supabase.from('projects').update(updates).eq('id', id)
    if (error) return error.message
    await fetchProjects()
    return null
  }, [fetchProjects])

  const deleteProject = useCallback(async (id: string) => {
    await supabase.from('projects').delete().eq('id', id)
    await fetchProjects()
  }, [fetchProjects])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  return { projects, loading, fetchProjects, createProject, updateProject, deleteProject }
}
