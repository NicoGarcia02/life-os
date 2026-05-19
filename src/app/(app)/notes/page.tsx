'use client'
import { useState, useMemo } from 'react'
import Modal from '@/components/ui/Modal'
import Btn from '@/components/ui/Btn'
import { Input, Textarea, SelectInput } from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { useNotes } from '@/hooks/useNotes'
import { formatDate, NOTE_CATEGORIES } from '@/lib/utils'
import type { Note } from '@/lib/types'

const CAT_COLORS: Record<string, string> = {
  General: 'var(--text-tertiary)',
  Ideas: 'var(--accent)',
  Trabajo: 'var(--yellow)',
  Personal: 'var(--green)',
  Salud: 'var(--red)',
  Finanzas: 'var(--purple)',
}

export default function NotesPage() {
  const { notes, loading, upsertNote, deleteNote } = useNotes()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editNote, setEditNote] = useState<Note | null>(null)
  const [form, setForm] = useState({ title: '', content: '', category: 'General' })
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  function openNew() {
    setEditNote(null)
    setForm({ title: '', content: '', category: 'General' })
    setModalOpen(true)
  }

  function openEdit(note: Note) {
    setEditNote(note)
    setForm({ title: note.title, content: note.content ?? '', category: note.category ?? 'General' })
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await upsertNote(editNote ? { ...form, id: editNote.id } : form)
    setModalOpen(false)
    setSaving(false)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return notes.filter(n => n.category !== '__quick__' && (
      !q || n.title.toLowerCase().includes(q) || (n.content ?? '').toLowerCase().includes(q)
    ))
  }, [notes, search])

  if (loading) return <div style={{ color: 'var(--text-tertiary)', padding: 40 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }} className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Notas</h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>{filtered.length} nota{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="input-base"
            placeholder="Buscar notas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 200 }}
          />
          <Btn variant="primary" onClick={openNew}>+ Nueva nota</Btn>
        </div>
      </div>

      {filtered.length === 0 && !search ? (
        <EmptyState icon="✎" title="Sin notas todavía" description="Capturá tus ideas, reflexiones y apuntes." action={{ label: '+ Nueva nota', onClick: openNew }} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔍" title="Sin resultados" description={`No encontramos notas con "${search}"`} />
      ) : (
        <div style={{
          columns: '3 280px',
          gap: 12,
        }}>
          {/* Nueva nota card */}
          <div
            onClick={openNew}
            style={{
              border: '2px dashed var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: 20,
              cursor: 'pointer',
              color: 'var(--text-tertiary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontSize: 14,
              marginBottom: 12,
              breakInside: 'avoid',
            }}
          >
            <span style={{ fontSize: 20 }}>+</span> Nueva nota
          </div>

          {filtered.map((note, i) => (
            <div
              key={note.id}
              className={`card animate-fade stagger-${Math.min(i + 1, 7)}`}
              style={{
                padding: 18,
                marginBottom: 12,
                breakInside: 'avoid',
                cursor: 'pointer',
              }}
              onClick={() => openEdit(note)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, flex: 1, marginRight: 8 }}>{note.title}</h3>
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDelete(note.id) }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', borderRadius: 4, flexShrink: 0 }}
                >✕</button>
              </div>
              {note.content && (
                <p style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  marginBottom: 12,
                }}>{note.content}</p>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 8px',
                  borderRadius: 4,
                  background: `${CAT_COLORS[note.category ?? 'General']}22`,
                  color: CAT_COLORS[note.category ?? 'General'],
                }}>
                  {note.category}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {formatDate(note.updated_at || note.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editNote ? 'Editar nota' : 'Nueva nota'} size="md">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <Input label="Título" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="Título de la nota" />
            </div>
            <SelectInput label="Categoría" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {NOTE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </SelectInput>
          </div>
          <Textarea label="Contenido" value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Escribí tu nota..." style={{ minHeight: 200 }} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            {editNote && <Btn variant="danger" type="button" onClick={() => { deleteNote(editNote.id); setModalOpen(false) }}>Eliminar</Btn>}
            <Btn variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancelar</Btn>
            <Btn variant="primary" type="submit" loading={saving}>Guardar</Btn>
          </div>
        </form>
      </Modal>

      {/* Confirm delete */}
      <Modal isOpen={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Eliminar nota" size="sm">
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>¿Estás seguro que querés eliminar esta nota? Esta acción no se puede deshacer.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Btn variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Btn>
          <Btn variant="danger" onClick={() => { if (confirmDelete) { deleteNote(confirmDelete); setConfirmDelete(null) } }}>Eliminar</Btn>
        </div>
      </Modal>
    </div>
  )
}
