'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import Btn from '@/components/ui/Btn'
import { Input, Textarea, SelectInput } from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import ProgressBar from '@/components/ui/ProgressBar'
import { useProjects } from '@/hooks/useProjects'
import { formatDate } from '@/lib/utils'
import type { Project } from '@/lib/types'

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

const EMPTY_FORM = {
  name: '', description: '', category: 'personal' as Project['category'],
  status: 'planificando' as Project['status'], color: '#7c9aff',
  start_date: '', deadline: '',
}

type StatusFilter = 'todos' | Project['status']

export default function ProjectsPage() {
  const router = useRouter()
  const { projects, loading, createProject } = useProjects()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('todos')

  const filtered = useMemo(() =>
    filter === 'todos' ? projects : projects.filter(p => p.status === filter),
    [projects, filter]
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    const err = await createProject({
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category,
      status: form.status,
      color: form.color,
      start_date: form.start_date || null,
      deadline: form.deadline || null,
    })
    setSaving(false)
    if (err) { setFormError(err); return }
    setModalOpen(false)
    setForm(EMPTY_FORM)
  }

  const filterTabs: { id: StatusFilter; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'en_curso', label: 'En curso' },
    { id: 'planificando', label: 'Planificando' },
    { id: 'pausado', label: 'Pausado' },
    { id: 'completado', label: 'Completado' },
  ]

  if (loading) return <div style={{ color: 'var(--text-tertiary)', padding: 40 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }} className="animate-fade">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Proyectos</h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>
            {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Btn variant="primary" onClick={() => setModalOpen(true)}>+ Nuevo proyecto</Btn>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {filterTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            style={{
              fontSize: 13, padding: '6px 14px', borderRadius: 20,
              border: `1px solid ${filter === t.id ? 'var(--accent)' : 'var(--border-default)'}`,
              background: filter === t.id ? 'var(--accent-muted)' : 'transparent',
              color: filter === t.id ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer', fontFamily: 'inherit', fontWeight: filter === t.id ? 600 : 400,
              transition: 'all 0.15s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Projects grid */}
      {filtered.length === 0 ? (
        projects.length === 0
          ? <EmptyState icon="◧" title="Sin proyectos todavía" description="Creá tu primer proyecto para empezar a gestionarlo." action={{ label: '+ Nuevo proyecto', onClick: () => setModalOpen(true) }} />
          : <EmptyState icon="◧" title="Sin proyectos con este estado" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filtered.map((project, i) => {
            const statusColor = STATUS_COLORS[project.status]
            const done = project.taskDone
            const total = project.taskTotal
            return (
              <div
                key={project.id}
                className={`card animate-fade stagger-${Math.min(i + 1, 7)}`}
                onClick={() => router.push(`/projects/${project.id}`)}
                style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', display: 'flex' }}
              >
                {/* Color bar */}
                <div style={{ width: 5, background: project.color, flexShrink: 0 }} />
                <div style={{ flex: 1, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600 }}>{project.name}</h3>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, flexShrink: 0,
                      background: `${statusColor}1a`, color: statusColor,
                    }}>{STATUS_LABELS[project.status]}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>
                    {CATEGORY_LABELS[project.category]}
                    {project.deadline && (
                      <> · Deadline: <span style={{ color: 'var(--text-secondary)' }}>{formatDate(project.deadline)}</span></>
                    )}
                  </div>
                  {project.description && (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {project.description}
                    </p>
                  )}
                  {total > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <ProgressBar value={done} total={total} height={5} />
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                        {done}/{total} tareas · {project.milestoneCount} hito{project.milestoneCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create project modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setForm(EMPTY_FORM); setFormError(null) }} title="Nuevo proyecto" size="md">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Nombre" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="Nombre del proyecto" />
          <Textarea label="Descripción" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="¿De qué trata este proyecto?" style={{ minHeight: 80 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <SelectInput label="Categoría" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value as Project['category'] }))}>
              <option value="personal">Personal</option>
              <option value="profesional">Profesional</option>
              <option value="estudio">Estudio</option>
              <option value="otro">Otro</option>
            </SelectInput>
            <SelectInput label="Estado" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as Project['status'] }))}>
              <option value="planificando">Planificando</option>
              <option value="en_curso">En curso</option>
              <option value="pausado">Pausado</option>
              <option value="completado">Completado</option>
            </SelectInput>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Fecha inicio" type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
            <Input label="Deadline" type="date" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
          </div>

          {/* Color picker */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PROJECT_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, color: c }))}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer',
                    outline: form.color === c ? `3px solid ${c}` : '3px solid transparent',
                    outlineOffset: 2, transition: 'outline 0.15s',
                  }}
                />
              ))}
            </div>
          </div>

          {formError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>
              {formError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Btn variant="ghost" type="button" onClick={() => { setModalOpen(false); setForm(EMPTY_FORM) }}>Cancelar</Btn>
            <Btn variant="primary" type="submit" loading={saving}>Crear proyecto</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
