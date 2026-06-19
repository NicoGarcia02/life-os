'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { ProjectMilestone } from '@/lib/types'

export function useProjectMilestones(projectId: string) {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchMilestones = useCallback(async () => {
    const { data } = await supabase
      .from('project_milestones')
      .select('*')
      .eq('project_id', projectId)
      .order('date')
    setMilestones(data ?? [])
    setLoading(false)
  }, [projectId])

  const addMilestone = useCallback(async (title: string, date: string): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'No autenticado'
    const { error } = await supabase.from('project_milestones').insert({
      project_id: projectId, user_id: user.id, title, date, achieved: false,
    })
    if (error) return error.message
    await fetchMilestones()
    return null
  }, [projectId, fetchMilestones])

  const updateMilestone = useCallback(async (id: string, updates: Partial<ProjectMilestone>) => {
    await supabase.from('project_milestones').update(updates).eq('id', id)
    await fetchMilestones()
  }, [fetchMilestones])

  const deleteMilestone = useCallback(async (id: string) => {
    await supabase.from('project_milestones').delete().eq('id', id)
    await fetchMilestones()
  }, [fetchMilestones])

  useEffect(() => { fetchMilestones() }, [fetchMilestones])

  return { milestones, loading, addMilestone, updateMilestone, deleteMilestone }
}
