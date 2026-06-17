'use client'
import { useState, useEffect, useMemo } from 'react'
import TabBar from '@/components/ui/TabBar'
import SectionHeader from '@/components/ui/SectionHeader'
import Modal from '@/components/ui/Modal'
import Btn from '@/components/ui/Btn'
import { Input, SelectInput } from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { useCalendar } from '@/hooks/useCalendar'
import { useNotifications, getStoredIntensity, storeIntensity, type NotifIntensity } from '@/hooks/useNotifications'
import { today, formatDate, TAG_COLORS } from '@/lib/utils'
import type { CalendarEvent } from '@/lib/types'

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const TAGS: CalendarEvent['tag'][] = ['Trabajo', 'Personal', 'Salud', 'Social', 'Educación']
const UNITS = [{ value: 'day', label: 'día(s)' }, { value: 'week', label: 'semana(s)' }, { value: 'month', label: 'mes(es)' }]

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
    if (!ev.recurring || !ev.recurrence_unit) {
      result.push(ev)
      continue
    }
    const interval = ev.recurrence_interval ?? 1
    const current = new Date(ev.date + 'T00:00:00')
    let safety = 500

    // Advance to first occurrence >= rangeStart
    while (current < startD && safety-- > 0) {
      advanceDate(current, interval, ev.recurrence_unit)
    }

    // Collect all occurrences in [rangeStart, rangeEnd]
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

type FormState = {
  title: string
  date: string
  time: string
  duration: string
  tag: CalendarEvent['tag']
  description: string
  recurring: boolean
  recurrence_interval: string
  recurrence_unit: 'day' | 'week' | 'month'
  notify: boolean
  notify_minutes_before: string
  notify_intensity: NotifIntensity
}

const EMPTY_FORM: FormState = {
  title: '', date: today(), time: '', duration: '60',
  tag: 'Personal', description: '',
  recurring: false, recurrence_interval: '1', recurrence_unit: 'week',
  notify: false, notify_minutes_before: '15', notify_intensity: 'normal',
}

export default function CalendarPage() {
  const { events, loading, fetchEvents, addEvent, updateEvent, deleteEvent } = useCalendar()
  const { schedule } = useNotifications()
  const [tab, setTab] = useState('mes')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [saving, setSaving] = useState(false)
  const [eventError, setEventError] = useState<string | null>(null)
  const [intensity, setIntensityLocal] = useState<NotifIntensity>('normal')

  useEffect(() => { setIntensityLocal(getStoredIntensity()) }, [])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const rangeStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const rangeEnd = dateToStr(new Date(year, month + 1, 0))

  useEffect(() => {
    fetchEvents(rangeStart, rangeEnd)
  }, [year, month, fetchEvents])

  const visibleEvents = useMemo(
    () => expandRecurring(events, rangeStart, rangeEnd),
    [events, rangeStart, rangeEnd]
  )

  useEffect(() => { schedule(visibleEvents) }, [visibleEvents, schedule])

  function prevMonth() { setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }

  const firstDay = new Date(year, month, 1).getDay()
  const offset = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const getEventsForDay = (dateStr: string) => visibleEvents.filter(e => e.date === dateStr)

  const todayStr = today()

  const groupedByDate: Record<string, CalendarEvent[]> = {}
  visibleEvents.forEach(ev => {
    if (!groupedByDate[ev.date]) groupedByDate[ev.date] = []
    groupedByDate[ev.date].push(ev)
  })

  async function handleSaveEvent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setEventError(null)
    const payload = {
      title: form.title,
      date: form.date,
      time: form.time || null,
      duration: parseInt(form.duration) || 60,
      tag: form.tag,
      description: form.description || null,
      recurring: form.recurring,
      recurrence_interval: form.recurring ? (parseInt(form.recurrence_interval) || 1) : null,
      recurrence_unit: form.recurring ? form.recurrence_unit : null,
      notify: form.notify,
      notify_minutes_before: parseInt(form.notify_minutes_before) || 15,
      notify_intensity: form.notify_intensity,
    }
    const err = editEvent ? await updateEvent(editEvent.id, payload) : await addEvent(payload)
    setSaving(false)
    if (err) { setEventError(err); return }
    setModalOpen(false)
    setEditEvent(null)
    setForm(EMPTY_FORM)
  }

  function openNew(date?: string) {
    setEditEvent(null)
    setForm({ ...EMPTY_FORM, date: date ?? today() })
    setModalOpen(true)
  }

  function openEdit(ev: CalendarEvent) {
    setEditEvent(ev)
    setForm({
      title: ev.title,
      date: ev.date,
      time: ev.time ?? '',
      duration: String(ev.duration ?? 60),
      tag: ev.tag,
      description: ev.description ?? '',
      recurring: ev.recurring ?? false,
      recurrence_interval: String(ev.recurrence_interval ?? 1),
      recurrence_unit: ev.recurrence_unit ?? 'week',
      notify: ev.notify ?? false,
      notify_minutes_before: String(ev.notify_minutes_before ?? 15),
      notify_intensity: ev.notify_intensity ?? 'normal',
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditEvent(null)
    setEventError(null)
    setForm(EMPTY_FORM)
  }

  if (loading) return <div style={{ color: 'var(--text-tertiary)', padding: 40 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }} className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Calendario</h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>Tus eventos y compromisos</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '6px 10px' }}>
            <span style={{ fontSize: 14 }}>🔔</span>
            <select
              value={intensity}
              onChange={e => { const v = e.target.value as NotifIntensity; setIntensityLocal(v); storeIntensity(v) }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: 12, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <option value="silent">Silenciosa</option>
              <option value="normal">Normal</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <Btn variant="primary" onClick={() => openNew()}>+ Nuevo evento</Btn>
        </div>
      </div>

      <TabBar
        tabs={[{ id: 'mes', label: 'Mes' }, { id: 'agenda', label: 'Agenda' }]}
        active={tab}
        onChange={setTab}
      />

      <div style={{ marginTop: 24 }}>
        {tab === 'mes' && (
          <div>
            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <button onClick={prevMonth} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', width: 32, height: 32, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 14 }}>‹</button>
              <h2 style={{ fontSize: 18, fontWeight: 600, minWidth: 180, textAlign: 'center' }}>
                {MONTHS_ES[month]} {year}
              </h2>
              <button onClick={nextMonth} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', width: 32, height: 32, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 14 }}>›</button>
            </div>

            {/* Day headers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
              {DAYS_ES.map(d => (
                <div key={d} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textAlign: 'center', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {Array.from({ length: offset }).map((_, i) => <div key={`e-${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const dayEvents = getEventsForDay(dateStr)
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDay
                return (
                  <div
                    key={day}
                    className="cal-cell"
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    style={{
                      height: 80, overflow: 'hidden', padding: '8px 6px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--accent-muted)' : isToday ? 'var(--bg-hover)' : 'var(--bg-elevated)',
                      border: `1px solid ${isToday || isSelected ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--accent)' : 'var(--text-primary)', marginBottom: 4 }}>{day}</div>
                    {dayEvents.slice(0, 2).map((ev, i) => (
                      <div key={ev.id + i} style={{
                        fontSize: 10, fontWeight: 500,
                        padding: '2px 4px', borderRadius: 3, marginBottom: 2,
                        background: `${TAG_COLORS[ev.tag] ?? 'var(--accent)'}22`,
                        color: TAG_COLORS[ev.tag] ?? 'var(--accent)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ev.recurring ? '🔁 ' : ''}{ev.time?.slice(0, 5) ?? ''} {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>+{dayEvents.length - 2} más</div>}
                  </div>
                )
              })}
            </div>

            {/* Selected day panel */}
            {(selectedDay || todayStr) && (() => {
              const showDate = selectedDay ?? todayStr
              const showEvents = getEventsForDay(showDate)
              return (
                <div className="card" style={{ marginTop: 20, padding: 20 }}>
                  <SectionHeader
                    title={showDate === todayStr ? 'Hoy' : formatDate(showDate, { weekday: 'long', day: 'numeric', month: 'long' })}
                    action={<Btn variant="secondary" size="sm" onClick={() => openNew(showDate)}>+ Evento</Btn>}
                  />
                  {showEvents.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '12px 0' }}>Sin eventos para este día</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {showEvents.map((ev, i) => (
                        <div key={ev.id + i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ width: 3, minHeight: 40, borderRadius: 2, background: TAG_COLORS[ev.tag] ?? 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                              {ev.title}
                              {ev.recurring && (
                                <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                                  🔁 c/{ev.recurrence_interval} {UNITS.find(u => u.value === ev.recurrence_unit)?.label}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                              {ev.time ? ev.time.slice(0, 5) : 'Todo el día'}{ev.duration ? ` · ${ev.duration}min` : ''} · {ev.tag}
                            </div>
                            {ev.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4, whiteSpace: 'pre-wrap' }}>{ev.description}</div>}
                          </div>
                          <Btn variant="ghost" size="sm" onClick={() => openEdit(ev)}>✎</Btn>
                          <Btn variant="danger" size="sm" onClick={async () => { await deleteEvent(ev.id); fetchEvents(rangeStart, rangeEnd) }}>✕</Btn>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {tab === 'agenda' && (
          <div>
            {Object.keys(groupedByDate).length === 0 ? (
              <EmptyState icon="▦" title="Sin eventos este mes" action={{ label: '+ Nuevo evento', onClick: () => openNew() }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.entries(groupedByDate).map(([date, dayEvs]) => (
                  <div key={date} className="card" style={{ padding: 20 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: date === todayStr ? 'var(--accent)' : 'var(--text-secondary)', marginBottom: 14 }}>
                      {date === todayStr ? 'Hoy' : formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {dayEvs.map((ev, i) => (
                        <div key={ev.id + i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                          <div style={{ width: 3, minHeight: 44, borderRadius: 2, background: TAG_COLORS[ev.tag] ?? 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                          <div style={{ width: 52, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0, paddingTop: 2 }}>
                            {ev.time?.slice(0, 5) ?? '—'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {ev.title}
                              {ev.recurring && (
                                <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
                                  🔁 c/{ev.recurrence_interval} {UNITS.find(u => u.value === ev.recurrence_unit)?.label}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                              {ev.duration && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{ev.duration}min</span>}
                              <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, background: `${TAG_COLORS[ev.tag] ?? 'var(--accent)'}22`, color: TAG_COLORS[ev.tag] ?? 'var(--accent)' }}>{ev.tag}</span>
                            </div>
                            {ev.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 5, whiteSpace: 'pre-wrap' }}>{ev.description}</div>}
                          </div>
                          <Btn variant="ghost" size="sm" onClick={() => openEdit(ev)}>✎</Btn>
                          <Btn variant="danger" size="sm" onClick={async () => { await deleteEvent(ev.id); fetchEvents(rangeStart, rangeEnd) }}>✕</Btn>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editEvent ? 'Editar evento' : 'Nuevo evento'} size="sm">
        <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Título" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="Nombre del evento" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Fecha" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
            <Input label="Hora" type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Duración (min)" type="number" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} min="5" />
            <SelectInput label="Etiqueta" value={form.tag} onChange={e => setForm(p => ({ ...p, tag: e.target.value as CalendarEvent['tag'] }))}>
              {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
            </SelectInput>
          </div>

          {/* Recurrencia */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div
                onClick={() => setForm(p => ({ ...p, recurring: !p.recurring }))}
                style={{ width: 40, height: 22, borderRadius: 11, background: form.recurring ? 'var(--accent)' : 'var(--border-default)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
              >
                <div style={{ position: 'absolute', top: 3, left: form.recurring ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', userSelect: 'none' }}>Evento recurrente</span>
            </label>
            {form.recurring && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-root)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', border: '1px solid var(--border-default)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Cada</span>
                <input
                  type="number"
                  min="1" max="99"
                  value={form.recurrence_interval}
                  onChange={e => setForm(p => ({ ...p, recurrence_interval: e.target.value }))}
                  style={{ width: 56, background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 14, padding: '6px 10px', outline: 'none', textAlign: 'center' }}
                />
                <select
                  value={form.recurrence_unit}
                  onChange={e => setForm(p => ({ ...p, recurrence_unit: e.target.value as 'day' | 'week' | 'month' }))}
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13, padding: '6px 10px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Notificación */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div
                onClick={() => setForm(p => ({ ...p, notify: !p.notify }))}
                style={{ width: 40, height: 22, borderRadius: 11, background: form.notify ? 'var(--accent)' : 'var(--border-default)', position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s' }}
              >
                <div style={{ position: 'absolute', top: 3, left: form.notify ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', userSelect: 'none' }}>Notificarme</span>
            </label>
            {form.notify && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-root)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', border: '1px solid var(--border-default)', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Avisar</span>
                <select
                  value={form.notify_minutes_before}
                  onChange={e => setForm(p => ({ ...p, notify_minutes_before: e.target.value }))}
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13, padding: '6px 10px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <option value="5">5 min antes</option>
                  <option value="10">10 min antes</option>
                  <option value="15">15 min antes</option>
                  <option value="30">30 min antes</option>
                  <option value="60">1 hora antes</option>
                  <option value="120">2 horas antes</option>
                </select>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>·</span>
                <select
                  value={form.notify_intensity}
                  onChange={e => setForm(p => ({ ...p, notify_intensity: e.target.value as NotifIntensity }))}
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13, padding: '6px 10px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  <option value="silent">🔕 Silenciosa</option>
                  <option value="normal">🔔 Normal</option>
                  <option value="urgent">🚨 Urgente</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Descripción</label>
            <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Notas, links, contexto..." rows={3}
              style={{ width: '100%', background: 'var(--bg-root)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: 13, padding: '9px 12px', resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {eventError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>
              {eventError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            {editEvent && <Btn variant="danger" type="button" onClick={async () => { await deleteEvent(editEvent.id); closeModal(); fetchEvents(rangeStart, rangeEnd) }}>Eliminar</Btn>}
            <Btn variant="ghost" type="button" onClick={closeModal}>Cancelar</Btn>
            <Btn variant="primary" type="submit" loading={saving}>{editEvent ? 'Guardar' : 'Crear evento'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
