'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import Btn from '@/components/ui/Btn'
import { today, formatDate } from '@/lib/utils'
import type { DailyClosing } from '@/lib/types'

const RATING_EMOJIS: Record<number, string> = { 1: '😫', 2: '😕', 3: '😐', 4: '🙂', 5: '🤩' }
const RATING_LABELS: Record<number, string> = { 1: 'Pésimo', 2: 'Mal', 3: 'Regular', 4: 'Bien', 5: 'Excelente' }

export default function JournalPage() {
  const supabase = createClient()
  const [entries, setEntries] = useState<DailyClosing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [onlyWithText, setOnlyWithText] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<DailyClosing | null>(null)
  const [form, setForm] = useState({ date: today(), day_rating: 4, journal: '' })
  const [saving, setSaving] = useState(false)

  const fetchEntries = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('daily_closings')
      .select('*')
      .eq('user_id', user.id)
      .lte('date', today())
      .order('date', { ascending: false })
    setEntries(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  function openNew() {
    setEditEntry(null)
    setForm({ date: today(), day_rating: 4, journal: '' })
    setModalOpen(true)
  }

  function openEdit(entry: DailyClosing) {
    setEditEntry(entry)
    setForm({ date: entry.date, day_rating: entry.day_rating ?? 4, journal: entry.journal ?? '' })
    setModalOpen(true)
  }

  async function saveEntry(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const payload = { date: form.date, day_rating: form.day_rating, journal: form.journal || null, user_id: user.id }
    if (editEntry) {
      await supabase.from('daily_closings').update({ day_rating: form.day_rating, journal: form.journal || null }).eq('id', editEntry.id)
    } else {
      await supabase.from('daily_closings').upsert(payload, { onConflict: 'user_id,date' })
    }
    setSaving(false)
    setModalOpen(false)
    await fetchEntries()
  }

  async function deleteEntry(id: string) {
    await supabase.from('daily_closings').delete().eq('id', id)
    await fetchEntries()
  }

  const filtered = entries
    .filter(e => !onlyWithText || (e.journal && e.journal.trim().length > 0))
    .filter(e => !search.trim() || e.journal?.toLowerCase().includes(search.toLowerCase().trim()))

  const withTextCount = entries.filter(e => e.journal && e.journal.trim().length > 0).length

  if (loading) return <div style={{ color: 'var(--text-tertiary)', padding: 40 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }} className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Diario</h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>
            {entries.length} cierres de día · {withTextCount} con reflexión escrita
          </p>
        </div>
        <Btn variant="primary" onClick={openNew}>+ Nueva entrada</Btn>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar en tus reflexiones..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 200,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: 14,
            padding: '9px 14px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <button
          onClick={() => setOnlyWithText(p => !p)}
          style={{
            padding: '9px 14px',
            borderRadius: 'var(--radius-sm)',
            border: `1px solid ${onlyWithText ? 'var(--accent)' : 'var(--border-default)'}`,
            background: onlyWithText ? 'var(--accent-muted)' : 'var(--bg-elevated)',
            color: onlyWithText ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: 13,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: 'inherit',
          }}
        >
          Solo con reflexión
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="📓"
          title={search || onlyWithText ? 'Sin resultados' : 'Sin cierres de día todavía'}
          description={
            search ? 'No hay reflexiones que coincidan con tu búsqueda.'
            : onlyWithText ? 'Ningún cierre tiene reflexión escrita todavía.'
            : 'Completá tu primer cierre de día para ver tus reflexiones acá.'
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((entry, i) => (
            <div
              key={entry.id}
              className={`card animate-fade stagger-${Math.min(i + 1, 7)}`}
              style={{ padding: '18px 20px' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                {/* Rating */}
                <div style={{ flexShrink: 0, textAlign: 'center', minWidth: 52 }}>
                  <div style={{ fontSize: 26, lineHeight: 1 }}>
                    {entry.day_rating ? RATING_EMOJIS[entry.day_rating] : '—'}
                  </div>
                  {entry.day_rating && (
                    <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 4, fontWeight: 500 }}>
                      {RATING_LABELS[entry.day_rating]}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: entry.journal ? 8 : 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {formatDate(entry.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                      <Btn variant="ghost" size="sm" onClick={() => openEdit(entry)}>✎</Btn>
                      <Btn variant="danger" size="sm" onClick={() => deleteEntry(entry.id)}>✕</Btn>
                    </div>
                  </div>
                  {entry.journal && entry.journal.trim() ? (
                    <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
                      {entry.journal}
                    </p>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic', margin: 0 }}>
                      Sin nota escrita
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editEntry ? 'Editar entrada' : 'Nueva entrada'} size="sm">
        <form onSubmit={saveEntry} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Fecha</label>
            <input type="date" value={form.date} max={today()} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              style={{ width: '100%', background: 'var(--bg-root)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13, padding: '9px 12px', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 10 }}>¿Cómo estuvo el día?</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} type="button" onClick={() => setForm(p => ({ ...p, day_rating: r }))}
                  style={{ flex: 1, padding: '8px 4px', borderRadius: 'var(--radius-sm)', border: `2px solid ${form.day_rating === r ? 'var(--accent)' : 'var(--border-default)'}`, background: form.day_rating === r ? 'var(--accent-muted)' : 'var(--bg-root)', cursor: 'pointer', fontSize: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <span>{RATING_EMOJIS[r]}</span>
                  <span style={{ fontSize: 9, color: form.day_rating === r ? 'var(--accent)' : 'var(--text-tertiary)' }}>{RATING_LABELS[r]}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Reflexión</label>
            <textarea value={form.journal} onChange={e => setForm(p => ({ ...p, journal: e.target.value }))} placeholder="¿Qué pasó hoy? ¿Cómo te sentiste?" rows={5}
              style={{ width: '100%', background: 'var(--bg-root)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 14, padding: '10px 12px', resize: 'vertical', fontFamily: 'inherit', outline: 'none', lineHeight: 1.7, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" type="button" onClick={() => setModalOpen(false)}>Cancelar</Btn>
            <Btn variant="primary" type="submit" loading={saving}>{editEntry ? 'Guardar' : 'Registrar'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
