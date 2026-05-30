'use client'
import { useState } from 'react'
import Modal from '@/components/ui/Modal'
import Btn from '@/components/ui/Btn'
import { Input, Textarea, SelectInput } from '@/components/ui/Input'
import { useTasks } from '@/hooks/useTasks'
import { today, formatDate, getWeekRange, getDaysInRange } from '@/lib/utils'
import type { Task } from '@/lib/types'

const PRIORITY_COLOR: Record<string, string> = {
  alta: 'var(--red)',
  media: 'var(--yellow)',
  baja: 'var(--green)',
}
const PRIORITY_BG: Record<string, string> = {
  alta: 'var(--red-muted)',
  media: 'var(--yellow-muted)',
  baja: 'var(--green-muted)',
}

function WeekNav({ offset, onChange }: { offset: number; onChange: (o: number) => void }) {
  const { start, end } = getWeekRange(offset)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button onClick={() => onChange(offset - 1)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', width: 32, height: 32, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16 }}>‹</button>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', minWidth: 220, textAlign: 'center' }}>
        {offset === 0 ? 'Esta semana — ' : offset === -1 ? 'Semana pasada — ' : ''}{formatDate(start, { day: 'numeric', month: 'short' })} al {formatDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
      <button onClick={() => onChange(offset + 1)} disabled={offset >= 0} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', width: 32, height: 32, cursor: offset >= 0 ? 'not-allowed' : 'pointer', color: offset >= 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)', fontSize: 16, opacity: offset >= 0 ? 0.4 : 1 }}>›</button>
    </div>
  )
}

export default function WeeklyTasksPage() {
  const { tasks, loading, addTask, toggleTask, deleteTask, updateTask } = useTasks()
  const [weekOffset, setWeekOffset] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [form, setForm] = useState({ title: '', description: '', priority: 'media' as Task['priority'], due_date: '' })
  const [saving, setSaving] = useState(false)

  const { start: weekStart, end: weekEnd } = getWeekRange(weekOffset)
  const weekDays = getDaysInRange(weekStart, weekEnd)
  const t = today()

  function openNew(date: string) {
    setEditTask(null)
    setForm({ title: '', description: '', priority: 'media', due_date: date })
    setModalOpen(true)
  }

  function openEdit(task: Task) {
    setEditTask(task)
    setForm({ title: task.title, description: task.description ?? '', priority: task.priority, due_date: task.due_date ?? '' })
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    if (editTask) {
      await updateTask(editTask.id, { ...form, due_date: form.due_date || null })
    } else {
      await addTask({ ...form, due_date: form.due_date || null })
    }
    setModalOpen(false)
    setSaving(false)
  }

  const weekTasksMap = weekDays.reduce<Record<string, Task[]>>((acc, day) => {
    acc[day] = tasks.filter(t => t.due_date === day)
    return acc
  }, {})

  const totalWeek = weekDays.reduce((s, d) => s + weekTasksMap[d].length, 0)
  const completedWeek = weekDays.reduce((s, d) => s + weekTasksMap[d].filter(t => t.completed).length, 0)

  if (loading) return <div style={{ color: 'var(--text-tertiary)', padding: 40 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }} className="animate-fade">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Tareas semanales</h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>
            {completedWeek}/{totalWeek} completadas esta semana
          </p>
        </div>
        <WeekNav offset={weekOffset} onChange={setWeekOffset} />
      </div>

      {/* Días */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {weekDays.map(day => {
          const dayTasks = weekTasksMap[day]
          const isToday = day === t
          const isPast = day < t
          const pending = dayTasks.filter(t => !t.completed)
          const done = dayTasks.filter(t => t.completed)

          return (
            <div key={day} className="card" style={{
              padding: '16px 18px',
              border: isToday ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
              opacity: isPast && !isToday ? 0.75 : 1,
            }}>
              {/* Cabecera del día */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: dayTasks.length > 0 ? 12 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: isToday ? 'var(--accent)' : 'var(--text-primary)',
                    textTransform: 'capitalize',
                  }}>
                    {formatDate(day, { weekday: 'long' })}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {formatDate(day, { day: 'numeric', month: 'short' })}
                  </span>
                  {isToday && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--accent-muted)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Hoy
                    </span>
                  )}
                  {dayTasks.length > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      {done.length}/{dayTasks.length}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => openNew(day)}
                  style={{
                    width: 28, height: 28,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: 16,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1,
                  }}
                  title={`Nueva tarea para ${formatDate(day, { weekday: 'long' })}`}
                >+</button>
              </div>

              {/* Tareas pendientes */}
              {pending.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: done.length > 0 ? 8 : 0 }}>
                  {pending.map(task => (
                    <TaskItem key={task.id} task={task} onToggle={() => toggleTask(task.id, true)} onEdit={() => openEdit(task)} onDelete={() => deleteTask(task.id)} />
                  ))}
                </div>
              )}

              {/* Tareas completadas */}
              {done.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {done.map(task => (
                    <TaskItem key={task.id} task={task} onToggle={() => toggleTask(task.id, false)} onEdit={() => openEdit(task)} onDelete={() => deleteTask(task.id)} />
                  ))}
                </div>
              )}

              {/* Vacío */}
              {dayTasks.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic', paddingTop: 2 }}>
                  Sin tareas
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal nueva/editar tarea */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editTask ? 'Editar tarea' : 'Nueva tarea'} size="md">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Título" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="¿Qué hay que hacer?" />
          <Textarea label="Descripción" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Detalles opcionales..." />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <SelectInput label="Prioridad" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value as Task['priority'] }))}>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </SelectInput>
            <Input label="Fecha límite" type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Btn variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancelar</Btn>
            <Btn variant="primary" type="submit" loading={saving}>{editTask ? 'Guardar cambios' : 'Crear tarea'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function TaskItem({ task, onToggle, onEdit, onDelete }: {
  task: Task
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 10px',
      borderRadius: 'var(--radius-sm)',
      background: 'var(--bg-active)',
      opacity: task.completed ? 0.55 : 1,
    }}>
      <div
        className={`habit-check ${task.completed ? 'checked' : ''}`}
        onClick={onToggle}
        style={{ cursor: 'pointer', flexShrink: 0 }}
      >
        {task.completed && <span style={{ color: '#fff', fontSize: 11 }}>✓</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 13, fontWeight: 500,
            textDecoration: task.completed ? 'line-through' : 'none',
            color: task.completed ? 'var(--text-tertiary)' : 'var(--text-primary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {task.title}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 6px',
            borderRadius: 4, flexShrink: 0,
            background: PRIORITY_BG[task.priority],
            color: PRIORITY_COLOR[task.priority],
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>{task.priority}</span>
        </div>
        {task.description && (
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.description}
          </div>
        )}
      </div>
      <button onClick={onEdit} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 13, padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>✎</button>
      <button onClick={onDelete} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 13, padding: '2px 6px', borderRadius: 4, flexShrink: 0 }}>✕</button>
    </div>
  )
}
