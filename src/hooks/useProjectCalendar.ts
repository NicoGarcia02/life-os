'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export interface ProjectCalendarItem {
  id: string
  rawId: string
  type: 'milestone' | 'deadline'
  title: string
  date: string
  projectName: string
  projectColor: string
  projectId: string
  achieved: boolean
}

export function useProjectCalendar(rangeStart: string, rangeEnd: string) {
  const [items, setItems] = useState<ProjectCalendarItem[]>([])
  const supabase = createClient()

  const fetchItems = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [milestonesRes, deadlinesRes] = await Promise.all([
      supabase
        .from('project_milestones')
        .select('id, title, date, achieved, project_id, projects(name, color)')
        .eq('user_id', user.id)
        .gte('date', rangeStart)
        .lte('date', rangeEnd),
      supabase
        .from('projects')
        .select('id, name, color, deadline')
        .eq('user_id', user.id)
        .gte('deadline', rangeStart)
        .lte('deadline', rangeEnd),
    ])

    const milestoneItems: ProjectCalendarItem[] = (milestonesRes.data ?? []).map((m: any) => ({
      id: `milestone-${m.id}`,
      rawId: m.id,
      type: 'milestone' as const,
      title: m.title,
      date: m.date,
      projectName: m.projects?.name ?? '',
      projectColor: m.projects?.color ?? '#7c9aff',
      projectId: m.project_id,
      achieved: m.achieved,
    }))

    const deadlineItems: ProjectCalendarItem[] = (deadlinesRes.data ?? [])
      .filter((p: any) => p.deadline)
      .map((p: any) => ({
        id: `deadline-${p.id}`,
        rawId: p.id,
        type: 'deadline' as const,
        title: p.name,
        date: p.deadline!,
        projectName: p.name,
        projectColor: p.color ?? '#7c9aff',
        projectId: p.id,
        achieved: false,
      }))

    setItems([...milestoneItems, ...deadlineItems])
  }, [rangeStart, rangeEnd])

  const updateMilestone = useCallback(async (id: string, title: string, date: string) => {
    await supabase.from('project_milestones').update({ title, date }).eq('id', id)
    await fetchItems()
  }, [fetchItems])

  const updateDeadline = useCallback(async (projectId: string, deadline: string) => {
    await supabase.from('projects').update({ deadline }).eq('id', projectId)
    await fetchItems()
  }, [fetchItems])

  useEffect(() => { fetchItems() }, [fetchItems])

  return { items, fetchItems, updateMilestone, updateDeadline }
}
