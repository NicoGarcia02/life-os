'use client'
import { useState, useMemo } from 'react'
import Modal from '@/components/ui/Modal'
import Btn from '@/components/ui/Btn'
import { Input, Textarea, SelectInput } from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { useNotes } from '@/hooks/useNotes'
import { formatDate, NOTE_CATEGORIES } from '@/lib/utils'
import type { Note } from '@/lib/types'

const BASE_CAT_COLORS: Record<string, string> = {
  General: 'var(--text-tertiary)',
  Ideas: 'var(--accent)',
  Trabajo: 'var(--yellow)',
  Personal: 'var(--green)',
  Salud: 'var(--red)',
  Finanzas: 'var(--purple)',
}

const CUSTOM_PALETTE = [
  '#a78bfa', '#34d399', '#fb923c', '#f472b6', '#38bdf8', '#facc15', '#a3e635',
]

function getCatColor(cat: string, customCats: string[]): string {
  if (BASE_CAT_COLORS[cat]) return BASE_CAT_COLORS[cat]
  const idx = customCats.indexOf(cat)
  return CUSTOM_PALETTE[idx % CUSTOM_PALETTE.length] ?? 'var(--text-tertiary)'
}

const STORAGE_KEY = 'life-os:note-categories'

function loadCustomCats(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch { return [] }
}

export default function NotesPage() {
  const { notes, loading, upsertNote, deleteNote, togglePin } = useNotes()
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editNote, setEditNote] = useState<Note | null>(null)
  const [form, setForm] = useState({ title: '', content: '', category: 'General' })
  const [saving, setSaving] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [viewNote, setViewNote] = useState<Note | null>(null)

  const [customCats, setCustomCats] = useState<string[]>(loadCustomCats)
  const [newCatInput, setNewCatInput] = useState('')
  const [showNewCat, setShowNewCat] = useState(false)

  const allCategories = [...NOTE_CATEGORIES, ...customCats]

  function addCustomCategory() {
    const name = newCatInput.trim()
    if (!name || allCategories.includes(name)) { setNewCatInput(''); setShowNewCat(false); return }
    const updated = [...customCats, name]
    setCustomCats(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setForm(p => ({ ...p, category: name }))
    setNewCatInput('')
    setShowNewCat(false)
  }

  function removeCustomCategory(cat: string) {
    const updated = customCats.filter(c => c !== cat)
    setCustomCats(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    if (form.category === cat) setForm(p => ({ ...p, category: 'General' }))
  }

  function openNew() {
    setEditNote(null)
    setForm({ title: '', content: '', category: 'General' })
    setShowNewCat(false)
    setNewCatInput('')
    setModalOpen(true)
  }

  function openEdit(note: Note) {
    setEditNote(note)
    setForm({ title: note.title, content: note.content ?? '', category: note.category ?? 'General' })
    setShowNewCat(false)
    setNewCatInput('')
    setModalOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setNoteError(null)
    const err = await upsertNote(editNote ? { ...form, id: editNote.id } : form)
    setSaving(false)
    if (err) { setNoteError(err); return }
    setModalOpen(false)
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
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Notas</h1>
            <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>{filtered.length} nota{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <Btn variant="primary" onClick={openNew}>+ Nueva nota</Btn>
        </div>
        <input
          className="input-base"
          placeholder="Buscar notas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 && !search ? (
        <EmptyState icon="✎" title="Sin notas todavía" description="Capturá tus ideas, reflexiones y apuntes." action={{ label: '+ Nueva nota', onClick: openNew }} />
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔍" title="Sin resultados" description={`No encontramos notas con "${search}"`} />
      ) : (
        <div style={{ columns: '3 280px', gap: 12 }}>
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

          {filtered.map((note, i) => {
            const color = getCatColor(note.category ?? 'General', customCats)
            return (
              <div
                key={note.id}
                className={`card animate-fade stagger-${Math.min(i + 1, 7)}`}
                style={{ padding: 18, marginBottom: 12, breakInside: 'avoid', cursor: 'pointer' }}
                onClick={() => setViewNote(note)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, flex: 1, marginRight: 8 }}>
                    {note.pinned && <span style={{ fontSize: 12, marginRight: 4 }}>📌</span>}{note.title}
                  </h3>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button
                      onClick={e => { e.stopPropagation(); togglePin(note.id, !note.pinned) }}
                      title={note.pinned ? 'Desfijar' : 'Fijar'}
                      style={{ background: note.pinned ? 'var(--accent-muted)' : 'none', border: 'none', color: note.pinned ? 'var(--accent)' : 'var(--text-tertiary)', cursor: 'pointer', fontSize: 12, padding: '2px 5px', borderRadius: 4 }}
                    >📌</button>
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDelete(note.id) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', borderRadius: 4 }}
                    >✕</button>
                  </div>
                </div>
                {note.content && (
                  <p style={{
                    fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', marginBottom: 12,
                  }}>{note.content}</p>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                    background: `${color}22`, color,
                  }}>{note.category}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {formatDate((note.updated_at || note.created_at).slice(0, 10))}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* View note modal */}
      <Modal isOpen={!!viewNote} onClose={() => setViewNote(null)} title={viewNote?.title ?? ''} size="md">
        {viewNote && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{
                fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 4,
                background: `${getCatColor(viewNote.category ?? 'General', customCats)}22`,
                color: getCatColor(viewNote.category ?? 'General', customCats),
              }}>{viewNote.category}</span>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                {formatDate((viewNote.updated_at || viewNote.created_at).slice(0, 10))}
              </span>
            </div>
            {viewNote.content && (
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {viewNote.content}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <Btn variant="ghost" onClick={() => setViewNote(null)}>Cerrar</Btn>
              <Btn variant="primary" onClick={() => { const n = viewNote; setViewNote(null); openEdit(n) }}>Editar</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit note modal */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setNoteError(null); setShowNewCat(false) }} title={editNote ? 'Editar nota' : 'Nueva nota'} size="md">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input label="Título" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="Título de la nota" />
            </div>
            <div style={{ flexShrink: 0 }}>
              <SelectInput label="Categoría" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </SelectInput>
            </div>
            <button
              type="button"
              title="Nueva categoría"
              onClick={() => setShowNewCat(v => !v)}
              style={{
                background: showNewCat ? 'var(--accent-muted)' : 'var(--bg-active)',
                border: `1px solid ${showNewCat ? 'var(--accent)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-sm)',
                color: showNewCat ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 18,
                width: 42,
                height: 42,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                marginBottom: 0,
              }}
            >+</button>
          </div>

          {/* Nueva categoría inline */}
          {showNewCat && (
            <div style={{ background: 'var(--bg-root)', borderRadius: 'var(--radius-sm)', padding: 12, border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Nueva categoría</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input-base"
                  placeholder="Nombre de la categoría"
                  value={newCatInput}
                  onChange={e => setNewCatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomCategory() } }}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <Btn variant="primary" type="button" onClick={addCustomCategory}>Crear</Btn>
              </div>
              {customCats.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6 }}>Categorías personalizadas</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {customCats.map((cat, idx) => {
                      const color = CUSTOM_PALETTE[idx % CUSTOM_PALETTE.length]
                      return (
                        <span key={cat} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 12, fontWeight: 500, padding: '3px 8px', borderRadius: 4,
                          background: `${color}22`, color,
                        }}>
                          {cat}
                          <button
                            type="button"
                            onClick={() => removeCustomCategory(cat)}
                            style={{ background: 'none', border: 'none', color, cursor: 'pointer', fontSize: 11, padding: 0, lineHeight: 1 }}
                          >✕</button>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <Textarea label="Contenido" value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} placeholder="Escribí tu nota..." style={{ minHeight: 200 }} />
          {noteError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>
              {noteError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            {editNote && <Btn variant="danger" type="button" onClick={() => { deleteNote(editNote.id); setModalOpen(false) }}>Eliminar</Btn>}
            <Btn variant="ghost" type="button" onClick={() => { setModalOpen(false); setNoteError(null); setShowNewCat(false) }}>Cancelar</Btn>
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
