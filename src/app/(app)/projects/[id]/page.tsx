'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Modal from '@/components/ui/Modal'
import Btn from '@/components/ui/Btn'
import { Input, Textarea, SelectInput } from '@/components/ui/Input'
import TabBar from '@/components/ui/TabBar'
import ProgressBar from '@/components/ui/ProgressBar'
import EmptyState from '@/components/ui/EmptyState'
import { useProjects } from '@/hooks/useProjects'
import { useProjectTasks } from '@/hooks/useProjectTasks'
import { useProjectMilestones } from '@/hooks/useProjectMilestones'
import { useProjectSubtasks } from '@/hooks/useProjectSubtasks'
import { formatDate } from '@/lib/utils'
import type { Project, ProjectTask } from '@/lib/types'

function TaskDetailModal({ task, onClose, onCycleStatus, onUpdateTask }: {
  task: ProjectTask
  onClose: () => void
  onCycleStatus: () => void
  onUpdateTask: (updates: { title?: string; description?: string }) => void
}) {
  const { subtasks, addSubtask, toggleSubtask, deleteSubtask } = useProjectSubtasks(task.id)
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')
  const [newSubtask, setNewSubtask] = useState('')
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const descRef = useRef<HTMLTextAreaElement>(null)
  const [subtaskOrder, setSubtaskOrder] = useState<string[]>([])
  const [dragSubId, setDragSubId] = useState<string | null>(null)
  const [dragOverSubId, setDragOverSubId] = useState<string | null>(null)

  useEffect(() => {
    if (subtasks.length === 0) { setSubtaskOrder([]); return }
    const stored = localStorage.getItem(`subtask-order-${task.id}`)
    if (stored) {
      try {
        const parsed: string[] = JSON.parse(stored)
        const valid = parsed.filter(sid => subtasks.some(s => s.id === sid))
        const newIds = subtasks.filter(s => !parsed.includes(s.id)).map(s => s.id)
        setSubtaskOrder([...valid, ...newIds])
      } catch { setSubtaskOrder(subtasks.map(s => s.id)) }
    } else {
      setSubtaskOrder(subtasks.map(s => s.id))
    }
  }, [subtasks, task.id])

  const orderedSubtasks = subtaskOrder.length > 0
    ? subtaskOrder.map(sid => subtasks.find(s => s.id === sid)).filter((s): s is typeof subtasks[0] => !!s)
    : subtasks

  function handleSubDragStart(e: React.DragEvent, subId: string) {
    setDragSubId(subId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleSubDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    setDragOverSubId(null)
    if (!dragSubId || dragSubId === targetId) return
    const newOrder = [...subtaskOrder]
    const fromIdx = newOrder.indexOf(dragSubId)
    const toIdx = newOrder.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) return
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, dragSubId)
    setSubtaskOrder(newOrder)
    localStorage.setItem(`subtask-order-${task.id}`, JSON.stringify(newOrder))
    setDragSubId(null)
  }

  useEffect(() => {
    const el = descRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [description, expanded])

  function handleTitleBlur() {
    if (title.trim() && title.trim() !== task.title) onUpdateTask({ title: title.trim() })
  }

  function handleDescBlur() {
    if (description !== (task.description ?? '')) onUpdateTask({ description: description || '' })
  }

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault()
    if (!newSubtask.trim()) return
    setAddingSubtask(true)
    await addSubtask(newSubtask.trim())
    setNewSubtask('')
    setAddingSubtask(false)
  }

  const doneCount = subtasks.filter(s => s.completed).length

  const expandBtn = (
    <button
      onClick={() => setExpanded(v => !v)}
      title={expanded ? 'Reducir' : 'Expandir'}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text-tertiary)', fontSize: 16, lineHeight: 1,
        padding: 4, borderRadius: 4,
      }}
    >{expanded ? '⊟' : '⊞'}</button>
  )

  const layout = expanded
    ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }
    : { display: 'flex', flexDirection: 'column' as const, gap: 16 }

  return (
    <Modal isOpen onClose={onClose} title="" size={expanded ? 'xl' : 'md'} headerActions={expandBtn}>
      <div style={layout}>
        {/* Left column (or full-width when compact): status + title + description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Status + title */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <button
              onClick={onCycleStatus}
              title="Cambiar estado"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 24, color: TASK_STATUS_COLOR[task.status],
                flexShrink: 0, lineHeight: 1, padding: '4px 0',
              }}
            >{TASK_STATUS_ICON[task.status]}</button>
            <div style={{ flex: 1 }}>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                style={{
                  width: '100%', background: 'transparent', border: 'none',
                  color: 'var(--text-primary)', fontSize: 18, fontWeight: 600,
                  outline: 'none', fontFamily: 'inherit', padding: 0,
                }}
              />
              <div style={{ fontSize: 12, color: TASK_STATUS_COLOR[task.status], marginTop: 2, fontWeight: 500 }}>
                {task.status === 'pendiente' ? 'Pendiente' : task.status === 'en_curso' ? 'En curso' : 'Listo'}
                <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}> · click en ícono para cambiar</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: expanded ? 1 : undefined }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Descripción</label>
            <textarea
              ref={descRef}
              value={description}
              onChange={e => setDescription(e.target.value)}
              onBlur={handleDescBlur}
              placeholder="Agregá contexto o notas sobre esta tarea..."
              style={{
                width: '100%',
                minHeight: expanded ? 260 : 80,
                background: 'var(--bg-root)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13,
                padding: '9px 12px', resize: 'vertical', fontFamily: 'inherit', outline: 'none',
                boxSizing: 'border-box', lineHeight: 1.6, overflow: 'hidden',
              }}
            />
          </div>
        </div>

        {/* Right column (or below when compact): subtasks */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Subtareas {subtasks.length > 0 && `(${doneCount}/${subtasks.length})`}
            </label>
          </div>

          {orderedSubtasks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
              {orderedSubtasks.map(sub => (
                <div key={sub.id}
                  draggable
                  onDragStart={e => handleSubDragStart(e, sub.id)}
                  onDragOver={e => { e.preventDefault(); setDragOverSubId(sub.id) }}
                  onDragLeave={() => setDragOverSubId(null)}
                  onDrop={e => handleSubDrop(e, sub.id)}
                  onDragEnd={() => { setDragSubId(null); setDragOverSubId(null) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', cursor: 'grab', opacity: dragSubId === sub.id ? 0.4 : 1, outline: dragOverSubId === sub.id && dragSubId !== sub.id ? '2px solid var(--accent)' : 'none' }}>
                  <button
                    onClick={() => toggleSubtask(sub.id, sub.completed)}
                    style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
                      border: `2px solid ${sub.completed ? 'var(--green)' : 'var(--border-default)'}`,
                      background: sub.completed ? 'var(--green)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {sub.completed && <span style={{ color: '#000', fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                  </button>
                  <span style={{
                    flex: 1, fontSize: 13,
                    textDecoration: sub.completed ? 'line-through' : 'none',
                    color: sub.completed ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  }}>{sub.title}</span>
                  <button
                    onClick={() => deleteSubtask(sub.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 12, padding: '2px 4px', opacity: 0.6 }}
                  >✕</button>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleAddSubtask} style={{ display: 'flex', gap: 8 }}>
            <input
              className="input-base"
              placeholder="+ Nueva subtarea..."
              value={newSubtask}
              onChange={e => setNewSubtask(e.target.value)}
              style={{ flex: 1 }}
            />
            <Btn variant="secondary" type="submit" loading={addingSubtask}>Agregar</Btn>
          </form>
        </div>
      </div>
    </Modal>
  )
}

const PROJECT_COLORS = [
  '#7c9aff', '#4ade80', '#f87171', '#fbbf24',
  '#c084fc', '#fb923c', '#38bdf8', '#f472b6',
]

const STATUS_COLORS: Record<Project['status'], string> = {
  planificando: 'var(--text-tertiary)',
  en_curso: 'var(--accent)',
  pausado: 'var(--yellow)',
  completado: 'var(--green)',
}

const STATUS_LABELS: Record<Project['status'], string> = {
  planificando: 'Planificando',
  en_curso: 'En curso',
  pausado: 'Pausado',
  completado: 'Completado',
}

const CATEGORY_LABELS: Record<Project['category'], string> = {
  personal: 'Personal', profesional: 'Profesional', estudio: 'Estudio', otro: 'Otro',
}

const TASK_STATUS_ICON: Record<string, string> = { pendiente: '○', en_curso: '◑', listo: '●' }
const TASK_STATUS_COLOR: Record<string, string> = {
  pendiente: 'var(--text-tertiary)', en_curso: 'var(--accent)', listo: 'var(--green)',
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { projects, loading: projectsLoading, updateProject, deleteProject } = useProjects()
  const { tasks, addTask, cycleStatus, updateTask, deleteTask } = useProjectTasks(id)
  const { milestones, addMilestone, updateMilestone, deleteMilestone } = useProjectMilestones(id)

  const [tab, setTab] = useState('tareas')
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<{
    name: string; description: string; category: Project['category']
    status: Project['status']; color: string; start_date: string; deadline: string
  } | null>(null)

  // Task add
  const [newTask, setNewTask] = useState('')
  const [addingTask, setAddingTask] = useState(false)

  // Milestone add
  const [newMilestone, setNewMilestone] = useState({ title: '', date: '' })
  const [addingMilestone, setAddingMilestone] = useState(false)
  const [milestoneSaving, setMilestoneSaving] = useState(false)

  // Task ordering
  const [taskOrder, setTaskOrder] = useState<string[]>([])
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null)

  // Notes autosave
  const [notes, setNotes] = useState('')
  const [notesSaved, setNotesSaved] = useState(true)
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const project = projects.find(p => p.id === id) ?? null

  useEffect(() => {
    if (project) setNotes(project.notes ?? '')
  }, [project?.id])

  useEffect(() => {
    if (tasks.length === 0) { setTaskOrder([]); return }
    const stored = localStorage.getItem(`task-order-${id}`)
    if (stored) {
      try {
        const parsed: string[] = JSON.parse(stored)
        const valid = parsed.filter(tid => tasks.some(t => t.id === tid))
        const newIds = tasks.filter(t => !parsed.includes(t.id)).map(t => t.id)
        setTaskOrder([...valid, ...newIds])
      } catch { setTaskOrder(tasks.map(t => t.id)) }
    } else {
      setTaskOrder(tasks.map(t => t.id))
    }
  }, [tasks, id])

  const orderedTasks = taskOrder.length > 0
    ? taskOrder.map(tid => tasks.find(t => t.id === tid)).filter((t): t is ProjectTask => !!t)
    : tasks

  function handleTaskDragStart(e: React.DragEvent, taskId: string) {
    setDragTaskId(taskId)
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleTaskDragOver(e: React.DragEvent, taskId: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragTaskId && dragTaskId !== taskId) setDragOverTaskId(taskId)
  }

  function handleTaskDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    setDragOverTaskId(null)
    if (!dragTaskId || dragTaskId === targetId) return
    const newOrder = [...taskOrder]
    const fromIdx = newOrder.indexOf(dragTaskId)
    const toIdx = newOrder.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) return
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, dragTaskId)
    setTaskOrder(newOrder)
    localStorage.setItem(`task-order-${id}`, JSON.stringify(newOrder))
    setDragTaskId(null)
  }

  const saveNotes = useCallback(async (value: string) => {
    if (!project) return
    await updateProject(project.id, { notes: value })
    setNotesSaved(true)
  }, [project, updateProject])

  function handleNotesChange(value: string) {
    setNotes(value)
    setNotesSaved(false)
    if (notesTimer.current) clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => saveNotes(value), 1500)
  }

  function openEdit() {
    if (!project) return
    setEditForm({
      name: project.name,
      description: project.description ?? '',
      category: project.category,
      status: project.status,
      color: project.color,
      start_date: project.start_date ?? '',
      deadline: project.deadline ?? '',
    })
    setEditModalOpen(true)
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editForm || !project) return
    setSaving(true)
    await updateProject(project.id, {
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
      category: editForm.category,
      status: editForm.status,
      color: editForm.color,
      start_date: editForm.start_date || null,
      deadline: editForm.deadline || null,
    })
    setSaving(false)
    setEditModalOpen(false)
  }

  async function handleDelete() {
    if (!project) return
    await deleteProject(project.id)
    router.push('/projects')
  }

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTask.trim()) return
    setAddingTask(true)
    await addTask(newTask.trim())
    setNewTask('')
    setAddingTask(false)
  }

  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault()
    if (!newMilestone.title.trim() || !newMilestone.date) return
    setMilestoneSaving(true)
    await addMilestone(newMilestone.title.trim(), newMilestone.date)
    setNewMilestone({ title: '', date: '' })
    setMilestoneSaving(false)
  }

  if (projectsLoading) return <div style={{ color: 'var(--text-tertiary)', padding: 40 }}>Cargando...</div>
  if (!project) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 16 }}>Proyecto no encontrado</div>
      <Link href="/projects" style={{ color: 'var(--accent)', fontSize: 14 }}>← Volver a Proyectos</Link>
    </div>
  )

  const taskDone = tasks.filter(t => t.status === 'listo').length
  const taskTotal = tasks.length
  const statusColor = STATUS_COLORS[project.status]

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }} className="animate-fade">
      {/* Back */}
      <Link href="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 13, textDecoration: 'none', marginBottom: 20 }}>
        ← Proyectos
      </Link>

      {/* Project header */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 24, borderLeft: `4px solid ${project.color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>{project.name}</h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                background: `${statusColor}1a`, color: statusColor,
              }}>{STATUS_LABELS[project.status]}</span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{CATEGORY_LABELS[project.category]}</span>
              {(project.start_date || project.deadline) && (
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {project.start_date ? formatDate(project.start_date) : '—'}
                  {' → '}
                  {project.deadline ? formatDate(project.deadline) : 'Sin deadline'}
                </span>
              )}
            </div>
            {project.description && (
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{project.description}</p>
            )}
            {taskTotal > 0 && (
              <div style={{ marginTop: 14 }}>
                <ProgressBar value={taskDone} total={taskTotal} height={6} showLabel />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="ghost" size="sm" onClick={openEdit}>✎ Editar</Btn>
            <Btn variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>✕</Btn>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <TabBar
        tabs={[
          { id: 'tareas', label: `Tareas (${taskDone}/${taskTotal})` },
          { id: 'hitos', label: `Hitos (${milestones.length})` },
          { id: 'notas', label: 'Notas' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div style={{ marginTop: 24 }}>
        {/* TAREAS */}
        {tab === 'tareas' && (
          <div>
            {tasks.length === 0 && (
              <EmptyState icon="○" title="Sin tareas todavía" description="Agregá las tareas de este proyecto." />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {orderedTasks.map(task => (
                <div
                  key={task.id}
                  className="card"
                  draggable
                  onDragStart={e => handleTaskDragStart(e, task.id)}
                  onDragOver={e => handleTaskDragOver(e, task.id)}
                  onDragLeave={() => setDragOverTaskId(null)}
                  onDrop={e => handleTaskDrop(e, task.id)}
                  onDragEnd={() => { setDragTaskId(null); setDragOverTaskId(null) }}
                  onClick={() => setSelectedTask(task)}
                  style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'grab', opacity: dragTaskId === task.id ? 0.4 : 1, outline: dragOverTaskId === task.id ? '2px solid var(--accent)' : 'none' }}
                >
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 14, userSelect: 'none', flexShrink: 0, lineHeight: 1 }}>⠿</span>
                  <button
                    onClick={e => { e.stopPropagation(); cycleStatus(task.id, task.status) }}
                    title="Cambiar estado"
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 20, color: TASK_STATUS_COLOR[task.status],
                      flexShrink: 0, lineHeight: 1, padding: 0,
                    }}
                  >{TASK_STATUS_ICON[task.status]}</button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: 14,
                      textDecoration: task.status === 'listo' ? 'line-through' : 'none',
                      color: task.status === 'listo' ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    }}>{task.title}</span>
                    {task.description && (
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.description}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11, padding: '2px 7px', borderRadius: 4, flexShrink: 0,
                    background: `${TASK_STATUS_COLOR[task.status]}1a`,
                    color: TASK_STATUS_COLOR[task.status],
                  }}>
                    {task.status === 'pendiente' ? 'Pendiente' : task.status === 'en_curso' ? 'En curso' : 'Listo'}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); deleteTask(task.id) }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 13, padding: '2px 4px', borderRadius: 4 }}
                  >✕</button>
                </div>
              ))}
            </div>

            {/* Add task */}
            <form onSubmit={handleAddTask} style={{ display: 'flex', gap: 8 }}>
              <input
                className="input-base"
                placeholder="+ Agregar tarea..."
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                style={{ flex: 1 }}
              />
              <Btn variant="secondary" type="submit" loading={addingTask}>Agregar</Btn>
            </form>
          </div>
        )}

        {/* HITOS */}
        {tab === 'hitos' && (
          <div>
            {milestones.length === 0 && (
              <EmptyState icon="◈" title="Sin hitos todavía" description="Agregá fechas clave del proyecto." />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {milestones.map(m => (
                <div
                  key={m.id}
                  className="card"
                  style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <button
                    onClick={() => updateMilestone(m.id, { achieved: !m.achieved })}
                    style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                      border: `2px solid ${m.achieved ? 'var(--green)' : 'var(--border-default)'}`,
                      background: m.achieved ? 'var(--green)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {m.achieved && <span style={{ color: '#000', fontSize: 11, fontWeight: 700 }}>✓</span>}
                  </button>
                  <div style={{ flex: 1 }}>
                    <span style={{
                      fontSize: 14, fontWeight: 500,
                      textDecoration: m.achieved ? 'line-through' : 'none',
                      color: m.achieved ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    }}>{m.title}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                    {formatDate(m.date)}
                  </span>
                  <button
                    onClick={() => deleteMilestone(m.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 13, padding: '2px 4px' }}
                  >✕</button>
                </div>
              ))}
            </div>

            {/* Add milestone */}
            <form onSubmit={handleAddMilestone} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                className="input-base"
                placeholder="Nombre del hito..."
                value={newMilestone.title}
                onChange={e => setNewMilestone(p => ({ ...p, title: e.target.value }))}
                style={{ flex: 1, minWidth: 180 }}
              />
              <input
                type="date"
                className="input-base"
                value={newMilestone.date}
                onChange={e => setNewMilestone(p => ({ ...p, date: e.target.value }))}
                style={{ width: 160 }}
              />
              <Btn variant="secondary" type="submit" loading={milestoneSaving}>Agregar</Btn>
            </form>
          </div>
        )}

        {/* NOTAS */}
        {tab === 'notas' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Notas del proyecto</span>
              <span style={{ fontSize: 12, color: notesSaved ? 'var(--green)' : 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                {notesSaved ? '✓ Guardado' : 'Guardando...'}
              </span>
            </div>
            <textarea
              value={notes}
              onChange={e => handleNotesChange(e.target.value)}
              placeholder="Ideas, decisiones, contexto del proyecto..."
              style={{
                width: '100%', minHeight: 320,
                background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
                fontSize: 14, lineHeight: 1.7, padding: '16px',
                resize: 'vertical', fontFamily: 'inherit', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        )}
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onCycleStatus={() => { cycleStatus(selectedTask.id, selectedTask.status); setSelectedTask(t => t ? { ...t, status: ({ pendiente: 'en_curso', en_curso: 'listo', listo: 'pendiente' } as const)[t.status] } : null) }}
          onUpdateTask={(updates) => { updateTask(selectedTask.id, updates); setSelectedTask(t => t ? { ...t, ...updates } : null) }}
        />
      )}

      {/* Edit project modal */}
      {editForm && (
        <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar proyecto" size="md">
          <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Nombre" value={editForm.name} onChange={e => setEditForm(p => p && ({ ...p, name: e.target.value }))} required />
            <Textarea label="Descripción" value={editForm.description} onChange={e => setEditForm(p => p && ({ ...p, description: e.target.value }))} style={{ minHeight: 80 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <SelectInput label="Categoría" value={editForm.category} onChange={e => setEditForm(p => p && ({ ...p, category: e.target.value as Project['category'] }))}>
                <option value="personal">Personal</option>
                <option value="profesional">Profesional</option>
                <option value="estudio">Estudio</option>
                <option value="otro">Otro</option>
              </SelectInput>
              <SelectInput label="Estado" value={editForm.status} onChange={e => setEditForm(p => p && ({ ...p, status: e.target.value as Project['status'] }))}>
                <option value="planificando">Planificando</option>
                <option value="en_curso">En curso</option>
                <option value="pausado">Pausado</option>
                <option value="completado">Completado</option>
              </SelectInput>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Fecha inicio" type="date" value={editForm.start_date} onChange={e => setEditForm(p => p && ({ ...p, start_date: e.target.value }))} />
              <Input label="Deadline" type="date" value={editForm.deadline} onChange={e => setEditForm(p => p && ({ ...p, deadline: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PROJECT_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setEditForm(p => p && ({ ...p, color: c }))}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', outline: editForm.color === c ? `3px solid ${c}` : '3px solid transparent', outlineOffset: 2 }} />
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <Btn variant="ghost" type="button" onClick={() => setEditModalOpen(false)}>Cancelar</Btn>
              <Btn variant="primary" type="submit" loading={saving}>Guardar cambios</Btn>
            </div>
          </form>
        </Modal>
      )}

      {/* Confirm delete */}
      <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)} title="Eliminar proyecto" size="sm">
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
          ¿Eliminás el proyecto <strong>{project.name}</strong>? Se borrarán todas sus tareas e hitos.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Btn>
          <Btn variant="danger" onClick={handleDelete}>Eliminar</Btn>
        </div>
      </Modal>
    </div>
  )
}
