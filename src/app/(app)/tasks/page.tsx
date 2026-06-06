'use client'
import { useState } from 'react'
import TabBar from '@/components/ui/TabBar'
import ProgressBar from '@/components/ui/ProgressBar'
import StatCard from '@/components/ui/StatCard'
import Modal from '@/components/ui/Modal'
import Btn from '@/components/ui/Btn'
import { Input, Textarea, SelectInput } from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { useTasks } from '@/hooks/useTasks'
import { today, formatDate } from '@/lib/utils'
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

function PriorityBadge({ priority }: { priority: Task['priority'] }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 8px',
      borderRadius: 4,
      background: PRIORITY_BG[priority],
      color: PRIORITY_COLOR[priority],
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
    }}>{priority}</span>
  )
}

const RECURRENCE_LABEL: Record<string, string> = { daily: 'Diaria', weekly: 'Semanal', monthly: 'Mensual' }

function TaskRow({ task, onToggle, onEdit, onDelete }: {
  task: Task
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="card" style={{
      padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 12,
      opacity: task.completed ? 0.6 : 1,
    }}>
      <div className={`habit-check ${task.completed ? 'checked' : ''}`} onClick={onToggle} style={{ cursor: 'pointer' }}>
        {task.completed && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 500, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
            {task.title}
          </span>
          <PriorityBadge priority={task.priority} />
          {task.label && (
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--accent-muted)', color: 'var(--accent)', letterSpacing: '0.03em' }}>
              {task.label}
            </span>
          )}
          {task.recurring && task.recurrence_pattern && (
            <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: 'rgba(99,102,241,0.12)', color: '#818cf8', letterSpacing: '0.03em' }}>
              🔁 {RECURRENCE_LABEL[task.recurrence_pattern]}
            </span>
          )}
        </div>
        {task.description && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</div>}
        {task.due_date && (
          <div style={{ fontSize: 12, color: task.due_date < today() && !task.completed ? 'var(--red)' : 'var(--text-tertiary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
            {task.due_date < today() && !task.completed ? '⚠️ ' : ''}Vence: {formatDate(task.due_date)}
          </div>
        )}
      </div>
      <Btn variant="ghost" size="sm" onClick={onEdit}>✎</Btn>
      <Btn variant="danger" size="sm" onClick={onDelete}>✕</Btn>
    </div>
  )
}

export default function TasksPage() {
  const { tasks, todayTasks, overdueTasks, overduePriority, loading, addTask, updateTask, toggleTask, deleteTask } = useTasks()
  const [tab, setTab] = useState('hoy')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [form, setForm] = useState({ title: '', description: '', priority: 'media' as Task['priority'], due_date: '', label: '', recurring: false, recurrence_pattern: 'weekly' as Task['recurrence_pattern'] })
  const [saving, setSaving] = useState(false)

  function openNew() {
    setEditTask(null)
    setForm({ title: '', description: '', priority: 'media', due_date: '', label: '', recurring: false, recurrence_pattern: 'weekly' })
    setModalOpen(true)
  }

  function openEdit(task: Task) {
    setEditTask(task)
    setForm({ title: task.title, description: task.description ?? '', priority: task.priority, due_date: task.due_date ?? '', label: task.label ?? '', recurring: task.recurring ?? false, recurrence_pattern: task.recurrence_pattern ?? 'weekly' })
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      due_date: form.due_date || null,
      label: form.label.trim() || null,
      recurring: form.recurring,
      recurrence_pattern: form.recurring ? form.recurrence_pattern : null,
    }
    if (editTask) {
      await updateTask(editTask.id, payload)
    } else {
      await addTask(payload)
    }
    setModalOpen(false)
    setSaving(false)
  }

  const t = today()
  const completedToday = todayTasks.filter(t => t.completed).length
  const pendingToday = todayTasks.filter(t => !t.completed)
  const doneToday = todayTasks.filter(t => t.completed)

  const upcoming = tasks.filter(task => !task.completed && task.due_date && task.due_date > t).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))
  const allCompleted = tasks.filter(t => t.completed).length
  const completionRate = tasks.length ? Math.round((allCompleted / tasks.length) * 100) : 0

  if (loading) return <div style={{ color: 'var(--text-tertiary)', padding: 40 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }} className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Tareas</h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>Organizá tu trabajo diario</p>
        </div>
        <Btn variant="primary" onClick={openNew}>+ Nueva tarea</Btn>
      </div>

      <TabBar
        tabs={[{ id: 'hoy', label: 'Hoy' }, { id: 'proximas', label: 'Próximas' }, { id: 'todas', label: 'Todas' }]}
        active={tab}
        onChange={setTab}
      />

      <div style={{ marginTop: 24 }}>
        {tab === 'hoy' && (
          <div>
            <ProgressBar value={completedToday} total={todayTasks.length || 1} showLabel height={8} style={{ marginBottom: 20 }} />

            {overdueTasks.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '10px 16px', background: 'var(--red-muted)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--red)' }}>
                  <span style={{ color: 'var(--red)', fontWeight: 600, fontSize: 14 }}>⚠️ Tareas atrasadas ({overdueTasks.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {overdueTasks.map(task => (
                    <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id, !task.completed)} onEdit={() => openEdit(task)} onDelete={() => deleteTask(task.id)} />
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Pendientes ({pendingToday.length})</div>
              {pendingToday.length === 0 && overdueTasks.length === 0 && (
                <EmptyState icon="✅" title="Todo al día" description="No tenés tareas pendientes para hoy." action={{ label: '+ Nueva tarea', onClick: openNew }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pendingToday.map((task, i) => (
                  <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id, !task.completed)} onEdit={() => openEdit(task)} onDelete={() => deleteTask(task.id)} />
                ))}
              </div>
            </div>

            {doneToday.length > 0 && (
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Completadas ({doneToday.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {doneToday.map(task => (
                    <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id, !task.completed)} onEdit={() => openEdit(task)} onDelete={() => deleteTask(task.id)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'proximas' && (
          <div>
            <div className="grid-3" style={{ gap: 12, marginBottom: 24 }}>
              <StatCard label="Pendientes" value={tasks.filter(t => !t.completed).length} />
              <StatCard label="Alta prioridad" value={tasks.filter(t => !t.completed && t.priority === 'alta').length} highlight={tasks.filter(t => !t.completed && t.priority === 'alta').length > 0 ? 'red' : undefined} />
              <StatCard label="Atrasadas" value={overdueTasks.length} highlight={overdueTasks.length > 0 ? 'red' : undefined} />
            </div>
            {upcoming.length === 0 ? (
              <EmptyState icon="📅" title="Sin tareas próximas" action={{ label: '+ Nueva tarea', onClick: openNew }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcoming.map(task => (
                  <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id, !task.completed)} onEdit={() => openEdit(task)} onDelete={() => deleteTask(task.id)} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'todas' && (
          <div>
            <div className="grid-3" style={{ gap: 12, marginBottom: 24 }}>
              <StatCard label="Total" value={tasks.length} />
              <StatCard label="Completadas" value={allCompleted} />
              <StatCard label="Tasa de completado" value={`${completionRate}%`} trendUp={completionRate >= 70} />
            </div>
            {tasks.length === 0 ? (
              <EmptyState icon="☑" title="Sin tareas todavía" action={{ label: '+ Nueva tarea', onClick: openNew }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.map(task => (
                  <TaskRow key={task.id} task={task} onToggle={() => toggleTask(task.id, !task.completed)} onEdit={() => openEdit(task)} onDelete={() => deleteTask(task.id)} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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
          <Input label="Etiqueta / Proyecto" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="Ej: Trabajo, Personal, Estudio..." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div
                onClick={() => setForm(p => ({ ...p, recurring: !p.recurring }))}
                style={{
                  width: 40, height: 22, borderRadius: 11,
                  background: form.recurring ? 'var(--accent)' : 'var(--border-default)',
                  position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s',
                }}
              >
                <div style={{
                  position: 'absolute', top: 3, left: form.recurring ? 21 : 3,
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  transition: 'left 0.2s',
                }} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', userSelect: 'none' }}>Tarea recurrente</span>
            </label>
            {form.recurring && (
              <SelectInput label="Frecuencia" value={form.recurrence_pattern ?? 'weekly'} onChange={e => setForm(p => ({ ...p, recurrence_pattern: e.target.value as Task['recurrence_pattern'] }))}>
                <option value="daily">Diaria</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
              </SelectInput>
            )}
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
