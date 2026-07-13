'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import Modal from '@/components/ui/Modal'
import Btn from '@/components/ui/Btn'
import { Input, Textarea, SelectInput } from '@/components/ui/Input'
import { useTasks } from '@/hooks/useTasks'
import { useSchedule } from '@/hooks/useSchedule'
import { today, formatDate, getWeekRange, getDaysInRange, TAG_COLORS } from '@/lib/utils'
import type { Task, CalendarEvent, ScheduleEntry } from '@/lib/types'

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

const SCHEDULE_CATEGORIES = ['Personal', 'Trabajo', 'Estudio', 'Salud', 'Ejercicio', 'Descanso']
const CATEGORY_COLORS: Record<string, string> = {
  Personal: 'var(--accent)',
  Trabajo: '#7c9aff',
  Estudio: '#c084fc',
  Salud: '#f87171',
  Ejercicio: '#4ade80',
  Descanso: '#fbbf24',
}
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6) // 06:00 → 23:00

function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function advanceDate(d: Date, interval: number, unit: 'day' | 'week' | 'month') {
  if (unit === 'day') d.setDate(d.getDate() + interval)
  else if (unit === 'week') d.setDate(d.getDate() + interval * 7)
  else if (unit === 'month') d.setMonth(d.getMonth() + interval)
}
function expandRecurring(events: CalendarEvent[], rangeStart: string, rangeEnd: string): CalendarEvent[] {
  const result: CalendarEvent[] = []
  const startD = new Date(rangeStart + 'T00:00:00')
  const endD = new Date(rangeEnd + 'T00:00:00')
  for (const ev of events) {
    if (!ev.recurring || !ev.recurrence_unit) { result.push(ev); continue }
    const interval = ev.recurrence_interval ?? 1
    const current = new Date(ev.date + 'T00:00:00')
    let safety = 500
    while (current < startD && safety-- > 0) advanceDate(current, interval, ev.recurrence_unit)
    while (current <= endD && safety-- > 0) {
      result.push({ ...ev, date: dateToStr(current) })
      advanceDate(current, interval, ev.recurrence_unit)
    }
  }
  return result.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return (a.time ?? '').localeCompare(b.time ?? '')
  })
}
function calcEndTime(time: string, duration: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + duration
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function WeekNav({ offset, onChange }: { offset: number; onChange: (o: number) => void }) {
  const { start, end } = getWeekRange(offset)
  const label = offset === 0 ? 'Esta semana' : offset === -1 ? 'Semana pasada' : offset === 1 ? 'Próxima semana' : null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button onClick={() => onChange(offset - 1)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', width: 32, height: 32, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16 }}>‹</button>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', minWidth: 240, textAlign: 'center' }}>
        {label && <span style={{ color: 'var(--accent)', marginRight: 6 }}>{label} —</span>}
        {formatDate(start, { day: 'numeric', month: 'short' })} al {formatDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
      <button onClick={() => onChange(offset + 1)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', width: 32, height: 32, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16 }}>›</button>
    </div>
  )
}

// ── Day Schedule Modal Content ───────────────────────────────────────────────
function DayScheduleContent({
  calendarEvents,
  scheduleEntries,
  onAdd,
  onUpdate,
  onDelete,
}: {
  calendarEvents: CalendarEvent[]
  scheduleEntries: ScheduleEntry[]
  onAdd: (time: string, title: string, duration: number, category: string) => Promise<void>
  onUpdate: (id: string, updates: Partial<Pick<ScheduleEntry, 'title' | 'duration' | 'category' | 'completed' | 'time'>>) => Promise<string | null>
  onDelete: (id: string) => void
}) {
  const [addingHour, setAddingHour] = useState<number | null>(null)
  const [addForm, setAddForm] = useState({ title: '', duration: '60', category: 'Personal', time: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: '', duration: '', category: '', time: '' })
  const [saving, setSaving] = useState(false)

  async function handleAdd(hour: number) {
    if (!addForm.title.trim()) return
    setSaving(true)
    const time = addForm.time || `${String(hour).padStart(2, '0')}:00`
    await onAdd(time, addForm.title.trim(), parseInt(addForm.duration) || 60, addForm.category)
    setAddForm({ title: '', duration: '60', category: 'Personal', time: '' })
    setAddingHour(null)
    setSaving(false)
  }

  function startEdit(entry: ScheduleEntry) {
    setEditingId(entry.id)
    setEditForm({ title: entry.title, duration: String(entry.duration), category: entry.category, time: entry.time.slice(0, 5) })
  }

  async function handleUpdate() {
    if (!editingId || !editForm.title.trim()) return
    setSaving(true)
    await onUpdate(editingId, {
      title: editForm.title.trim(),
      duration: parseInt(editForm.duration) || 60,
      category: editForm.category,
      time: editForm.time || undefined,
    })
    setEditingId(null)
    setSaving(false)
  }

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 16, alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }} />
          Mis actividades
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--green)', display: 'inline-block' }} />
          Del calendario
        </span>
      </div>

      {/* Hourly grid */}
      {HOURS.map(hour => {
        const timePrefix = `${String(hour).padStart(2, '0')}:`
        const calEventsThisHour = calendarEvents.filter(ev => ev.time?.startsWith(timePrefix))
        const schedEntriesThisHour = scheduleEntries.filter(e => e.time?.startsWith(timePrefix))
        const isAdding = addingHour === hour

        return (
          <div key={hour} style={{ display: 'flex' }}>
            {/* Hour label */}
            <div style={{
              width: 52, flexShrink: 0,
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--text-tertiary)', paddingTop: 10,
              textAlign: 'right', paddingRight: 14,
            }}>
              {String(hour).padStart(2, '0')}:00
            </div>

            {/* Content column */}
            <div style={{
              flex: 1, borderTop: '1px solid var(--border-subtle)',
              paddingTop: 6, paddingBottom: 6, paddingLeft: 4, minHeight: 36,
            }}>
              {/* Calendar events — read only */}
              {calEventsThisHour.map((ev, i) => (
                <div key={ev.id + i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 4, padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: `${TAG_COLORS[ev.tag] ?? 'var(--green)'}18`,
                  border: `1px solid ${TAG_COLORS[ev.tag] ?? 'var(--green)'}33`,
                }}>
                  <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: TAG_COLORS[ev.tag] ?? 'var(--green)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{ev.title}</div>
                    {ev.time && (
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                        {ev.time.slice(0, 5)}{ev.duration ? ` → ${calcEndTime(ev.time.slice(0, 5), ev.duration)} · ${ev.duration}min` : ''}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: `${TAG_COLORS[ev.tag] ?? 'var(--green)'}22`, color: TAG_COLORS[ev.tag] ?? 'var(--green)', flexShrink: 0 }}>{ev.tag}</span>
                </div>
              ))}

              {/* Schedule entries */}
              {schedEntriesThisHour.map(entry =>
                editingId === entry.id ? (
                  // Edit form inline
                  <div key={entry.id} style={{
                    marginBottom: 4, padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-active)',
                    border: '1px solid var(--accent)',
                  }}>
                    <input
                      autoFocus
                      value={editForm.title}
                      onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleUpdate(); if (e.key === 'Escape') setEditingId(null) }}
                      style={{ width: '100%', background: 'var(--bg-root)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '5px 8px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit', marginBottom: 6, boxSizing: 'border-box' }}
                    />
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Inicio</span>
                        <input
                          type="time"
                          value={editForm.time}
                          onChange={e => setEditForm(p => ({ ...p, time: e.target.value }))}
                          style={{ background: 'var(--bg-root)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '4px 6px', color: 'var(--text-primary)', fontSize: 12, outline: 'none', fontFamily: 'var(--font-mono)', colorScheme: 'dark' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Duración</span>
                        <input
                          type="number"
                          value={editForm.duration}
                          onChange={e => setEditForm(p => ({ ...p, duration: e.target.value }))}
                          min="5" max="480"
                          style={{ width: 56, background: 'var(--bg-root)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '4px 6px', color: 'var(--text-primary)', fontSize: 12, outline: 'none', textAlign: 'center' }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>min</span>
                      </div>
                      <select
                        value={editForm.category}
                        onChange={e => setEditForm(p => ({ ...p, category: e.target.value }))}
                        style={{ background: 'var(--bg-root)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 12, padding: '4px 6px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        {SCHEDULE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                        <button
                          onClick={handleUpdate}
                          disabled={saving || !editForm.title.trim()}
                          style={{ background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 10px', cursor: 'pointer', opacity: saving || !editForm.title.trim() ? 0.5 : 1 }}
                        >✓</button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
                        >✕</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Normal display
                  <div key={entry.id} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 4, padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: entry.completed ? 'var(--bg-elevated)' : 'var(--accent-muted)',
                    border: `1px solid ${entry.completed ? 'var(--border-subtle)' : 'rgba(124,154,255,0.2)'}`,
                    opacity: entry.completed ? 0.6 : 1,
                    transition: 'opacity 0.15s, background 0.15s',
                  }}>
                    {/* Checkbox */}
                    <div
                      onClick={() => onUpdate(entry.id, { completed: !entry.completed })}
                      style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                        border: `2px solid ${entry.completed ? 'var(--accent)' : 'var(--border-strong)'}`,
                        background: entry.completed ? 'var(--accent)' : 'transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'background 0.15s',
                      }}
                    >
                      {entry.completed && <span style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>✓</span>}
                    </div>
                    {/* Color bar */}
                    <div style={{ width: 3, alignSelf: 'stretch', borderRadius: 2, background: CATEGORY_COLORS[entry.category] ?? 'var(--accent)', flexShrink: 0 }} />
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', textDecoration: entry.completed ? 'line-through' : 'none' }}>
                        {entry.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: 1 }}>
                        {entry.time.slice(0, 5)} → {calcEndTime(entry.time.slice(0, 5), entry.duration)} · {entry.duration}min
                      </div>
                    </div>
                    {/* Category badge */}
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: `${CATEGORY_COLORS[entry.category] ?? 'var(--accent)'}22`, color: CATEGORY_COLORS[entry.category] ?? 'var(--accent)', flexShrink: 0 }}>
                      {entry.category}
                    </span>
                    <button onClick={() => startEdit(entry)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 13, padding: '0 2px', flexShrink: 0 }}>✎</button>
                    <button onClick={() => onDelete(entry.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 13, padding: '0 2px', flexShrink: 0 }}>✕</button>
                  </div>
                )
              )}

              {/* Add form or button */}
              {isAdding ? (
                <div style={{ marginTop: 2 }}>
                  <input
                    autoFocus
                    value={addForm.title}
                    onChange={e => setAddForm(p => ({ ...p, title: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') handleAdd(hour); if (e.key === 'Escape') setAddingHour(null) }}
                    placeholder="Nueva actividad..."
                    style={{ width: '100%', background: 'var(--bg-root)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '5px 10px', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'inherit', marginBottom: 6, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Inicio</span>
                      <input
                        type="time"
                        value={addForm.time}
                        onChange={e => setAddForm(p => ({ ...p, time: e.target.value }))}
                        style={{ background: 'var(--bg-root)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '4px 6px', color: 'var(--text-primary)', fontSize: 12, outline: 'none', fontFamily: 'var(--font-mono)', colorScheme: 'dark' }}
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Duración</span>
                      <input
                        type="number"
                        value={addForm.duration}
                        onChange={e => setAddForm(p => ({ ...p, duration: e.target.value }))}
                        min="5" max="480"
                        style={{ width: 56, background: 'var(--bg-root)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '4px 6px', color: 'var(--text-primary)', fontSize: 12, outline: 'none', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>min</span>
                    </div>
                    <select
                      value={addForm.category}
                      onChange={e => setAddForm(p => ({ ...p, category: e.target.value }))}
                      style={{ background: 'var(--bg-root)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 12, padding: '4px 6px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                      {SCHEDULE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                      <button
                        onClick={() => handleAdd(hour)}
                        disabled={saving || !addForm.title.trim()}
                        style={{ background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: 12, fontWeight: 600, padding: '4px 10px', cursor: 'pointer', opacity: saving || !addForm.title.trim() ? 0.5 : 1 }}
                      >✓</button>
                      <button
                        onClick={() => setAddingHour(null)}
                        style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
                      >✕</button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingHour(hour); setEditingId(null); setAddForm(p => ({ ...p, title: '', time: `${String(hour).padStart(2, '0')}:00` })) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 11, padding: '1px 0', display: 'flex', alignItems: 'center', gap: 3 }}
                >+ agregar</button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Week Grid Modal ──────────────────────────────────────────────────────────
function WeekGridModal({
  weekDays,
  dayLabels,
  calendarEvents,
}: {
  weekDays: string[]
  dayLabels: string[]
  calendarEvents: CalendarEvent[]
}) {
  const supabase = createClient()
  const [weekEntries, setWeekEntries] = useState<ScheduleEntry[]>([])
  const todayStr = today()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('schedule_entries')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', weekDays[0])
        .lte('date', weekDays[6])
        .order('time')
      setWeekEntries(data ?? [])
    }
    load()
  }, [weekDays[0], weekDays[6]])

  return (
    <div>
      {/* Day headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '48px repeat(7, 1fr)',
        borderBottom: '1px solid var(--border-default)',
        paddingBottom: 10,
        marginBottom: 0,
        position: 'sticky',
        top: -20,
        background: 'var(--bg-surface)',
        zIndex: 2,
      }}>
        <div />
        {weekDays.map((day, i) => {
          const isToday = day === todayStr
          return (
            <div key={day} style={{ textAlign: 'center', padding: '0 2px' }}>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{dayLabels[i]}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: isToday ? 'var(--accent)' : 'var(--text-primary)', marginTop: 2 }}>
                {formatDate(day, { day: 'numeric' })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Scrollable hourly grid */}
      <div style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 140px)' }}>
        {HOURS.map(hour => {
          const timePrefix = `${String(hour).padStart(2, '0')}:`
          return (
            <div key={hour} style={{
              display: 'grid',
              gridTemplateColumns: '48px repeat(7, 1fr)',
              minHeight: 52,
              borderTop: '1px solid var(--border-subtle)',
            }}>
              {/* Hour label */}
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                color: 'var(--text-tertiary)', paddingTop: 6,
                textAlign: 'right', paddingRight: 8, flexShrink: 0,
              }}>
                {String(hour).padStart(2, '0')}:00
              </div>

              {/* Day cells */}
              {weekDays.map(day => {
                const calEvs = calendarEvents.filter(ev => ev.date === day && ev.time?.startsWith(timePrefix))
                const entries = weekEntries.filter(e => e.date === day && e.time?.startsWith(timePrefix))
                return (
                  <div key={day} style={{
                    borderLeft: '1px solid var(--border-subtle)',
                    padding: '4px 3px',
                    minWidth: 0,
                  }}>
                    {calEvs.map((ev, i) => (
                      <div key={ev.id + i} style={{
                        fontSize: 10, fontWeight: 500, padding: '2px 5px',
                        borderRadius: 3, marginBottom: 2,
                        borderLeft: `2px solid ${TAG_COLORS[ev.tag] ?? 'var(--green)'}`,
                        background: `${TAG_COLORS[ev.tag] ?? 'var(--green)'}18`,
                        color: TAG_COLORS[ev.tag] ?? 'var(--green)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ev.time?.slice(0, 5)} {ev.title}
                      </div>
                    ))}
                    {entries.map(entry => (
                      <div key={entry.id} style={{
                        fontSize: 10, fontWeight: 500, padding: '2px 5px',
                        borderRadius: 3, marginBottom: 2,
                        borderLeft: `2px solid ${CATEGORY_COLORS[entry.category] ?? 'var(--accent)'}`,
                        background: entry.completed ? 'var(--bg-elevated)' : 'var(--accent-muted)',
                        color: CATEGORY_COLORS[entry.category] ?? 'var(--accent)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        textDecoration: entry.completed ? 'line-through' : 'none',
                        opacity: entry.completed ? 0.55 : 1,
                      }}>
                        {entry.time.slice(0, 5)} {entry.title}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function WeeklyTasksPage() {
  const supabase = createClient()
  const { tasks, loading, addTask, toggleTask, deleteTask, updateTask } = useTasks()
  const { entries: scheduleEntries, fetchEntries, addEntry, updateEntry, deleteEntry } = useSchedule()

  const [weekOffset, setWeekOffset] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<Task | null>(null)
  const [form, setForm] = useState({ title: '', description: '', priority: 'media' as Task['priority'], due_date: '' })
  const [saving, setSaving] = useState(false)
  const [dragTaskId, setDragTaskId] = useState<string | null>(null)
  const [dragOverDay, setDragOverDay] = useState<string | null>(null)

  const [scheduleDay, setScheduleDay] = useState<string | null>(null)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [weekScheduleOpen, setWeekScheduleOpen] = useState(false)

  const { start: weekStart, end: weekEnd } = getWeekRange(weekOffset)
  const weekDays = getDaysInRange(weekStart, weekEnd)
  const t = today()

  const fetchCalendarEvents = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [nonRec, rec] = await Promise.all([
      supabase.from('events').select('*').eq('user_id', user.id).eq('recurring', false).gte('date', weekStart).lte('date', weekEnd),
      supabase.from('events').select('*').eq('user_id', user.id).eq('recurring', true).lte('date', weekEnd),
    ])
    const all = [...(nonRec.data ?? []), ...(rec.data ?? [])]
    setCalendarEvents(expandRecurring(all, weekStart, weekEnd))
  }, [weekStart, weekEnd])

  useEffect(() => { fetchCalendarEvents() }, [fetchCalendarEvents])
  useEffect(() => { setScheduleDay(null) }, [weekOffset])
  useEffect(() => { if (scheduleDay) fetchEntries(scheduleDay) }, [scheduleDay, fetchEntries])

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
      await addTask({ ...form, due_date: form.due_date || null, recurring: false, recurrence_pattern: null, label: null })
    }
    setModalOpen(false)
    setSaving(false)
  }

  async function handleDrop(newDate: string) {
    if (!dragTaskId) return
    const task = tasks.find(t => t.id === dragTaskId)
    if (task && task.due_date !== newDate) {
      await updateTask(dragTaskId, { due_date: newDate })
    }
    setDragTaskId(null)
    setDragOverDay(null)
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

      {/* Expandir horarios */}
      <button
        onClick={() => setWeekScheduleOpen(true)}
        style={{
          width: '100%',
          padding: '14px 20px',
          marginBottom: 20,
          borderRadius: 'var(--radius-md)',
          border: '1.5px dashed var(--accent)',
          background: 'var(--accent-muted)',
          color: 'var(--accent)',
          cursor: 'pointer',
          fontSize: 15,
          fontWeight: 600,
          letterSpacing: '0.01em',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Expandir horarios — ver semana completa
      </button>

      {/* Días */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {weekDays.map(day => {
          const dayTasks = weekTasksMap[day]
          const isToday = day === t
          const isPast = day < t
          const pending = dayTasks.filter(t => !t.completed)
          const done = dayTasks.filter(t => t.completed)

          return (
            <div key={day} className="card"
              onDragOver={e => { e.preventDefault(); setDragOverDay(day) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverDay(null) }}
              onDrop={async e => { e.preventDefault(); await handleDrop(day) }}
              style={{
                padding: '16px 18px',
                border: dragOverDay === day && dragTaskId ? '1px solid var(--accent)' : isToday ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                background: dragOverDay === day && dragTaskId ? 'rgba(124,154,255,0.06)' : undefined,
                opacity: isPast && !isToday ? 0.75 : 1,
                transition: 'border-color 0.1s, background 0.1s',
              }}>
              {/* Day header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: dayTasks.length > 0 ? 12 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: isToday ? 'var(--accent)' : 'var(--text-primary)', textTransform: 'capitalize' }}>
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
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{done.length}/{dayTasks.length}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => setScheduleDay(day)}
                    style={{
                      height: 28, padding: '0 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-default)',
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-tertiary)',
                      cursor: 'pointer', fontSize: 11,
                      fontWeight: 500, letterSpacing: '0.02em',
                    }}
                    title="Ver horario del día"
                  >Horario</button>
                  <button
                    onClick={() => openNew(day)}
                    style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                    title={`Nueva tarea para ${formatDate(day, { weekday: 'long' })}`}
                  >+</button>
                </div>
              </div>

              {/* Pending tasks */}
              {pending.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: done.length > 0 ? 8 : 0 }}>
                  {pending.map(task => (
                    <TaskItem key={task.id} task={task} onToggle={() => toggleTask(task.id, true)} onEdit={() => openEdit(task)} onDelete={() => deleteTask(task.id)} isDragging={dragTaskId === task.id} onDragStart={() => setDragTaskId(task.id)} onDragEnd={() => { setDragTaskId(null); setDragOverDay(null) }} />
                  ))}
                </div>
              )}

              {/* Done tasks */}
              {done.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {done.map(task => (
                    <TaskItem key={task.id} task={task} onToggle={() => toggleTask(task.id, false)} onEdit={() => openEdit(task)} onDelete={() => deleteTask(task.id)} isDragging={dragTaskId === task.id} onDragStart={() => setDragTaskId(task.id)} onDragEnd={() => { setDragTaskId(null); setDragOverDay(null) }} />
                  ))}
                </div>
              )}

              {dayTasks.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic', paddingTop: 2 }}>Sin tareas</div>
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

      {/* Modal horario del día */}
      <Modal
        isOpen={scheduleDay !== null}
        onClose={() => setScheduleDay(null)}
        title={scheduleDay ? formatDate(scheduleDay, { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
        size="lg"
      >
        {scheduleDay && (
          <DayScheduleContent
            key={scheduleDay}
            calendarEvents={calendarEvents.filter(ev => ev.date === scheduleDay)}
            scheduleEntries={scheduleEntries}
            onAdd={async (time, title, duration, category) => {
              await addEntry({ date: scheduleDay, time, title, duration, category })
            }}
            onUpdate={updateEntry}
            onDelete={deleteEntry}
          />
        )}
      </Modal>

      {/* Modal semana completa */}
      <Modal
        isOpen={weekScheduleOpen}
        onClose={() => setWeekScheduleOpen(false)}
        title={`Semana — ${formatDate(weekStart, { day: 'numeric', month: 'short' })} al ${formatDate(weekEnd, { day: 'numeric', month: 'short' })}`}
        size="xl"
      >
        <WeekGridModal
          weekDays={weekDays}
          dayLabels={weekDays.map(d => formatDate(d, { weekday: 'short' }))}
          calendarEvents={calendarEvents}
        />
      </Modal>
    </div>
  )
}

function TaskItem({ task, onToggle, onEdit, onDelete, onDragStart, onDragEnd, isDragging }: {
  task: Task
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onDragStart?: () => void
  onDragEnd?: () => void
  isDragging?: boolean
}) {
  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart?.() }}
      onDragEnd={onDragEnd}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px', borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-active)',
        opacity: isDragging ? 0.4 : task.completed ? 0.55 : 1,
        cursor: 'grab',
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
          <span style={{ fontSize: 13, fontWeight: 500, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-tertiary)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {task.title}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, flexShrink: 0, background: PRIORITY_BG[task.priority], color: PRIORITY_COLOR[task.priority], textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {task.priority}
          </span>
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
