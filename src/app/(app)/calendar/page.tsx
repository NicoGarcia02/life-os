'use client'
import { useState, useEffect } from 'react'
import TabBar from '@/components/ui/TabBar'
import SectionHeader from '@/components/ui/SectionHeader'
import Modal from '@/components/ui/Modal'
import Btn from '@/components/ui/Btn'
import { Input, SelectInput } from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { useCalendar } from '@/hooks/useCalendar'
import { today, formatDate, TAG_COLORS } from '@/lib/utils'
import type { CalendarEvent } from '@/lib/types'

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const TAGS: CalendarEvent['tag'][] = ['Trabajo', 'Personal', 'Salud', 'Social', 'Educación']

export default function CalendarPage() {
  const { events, loading, fetchEvents, addEvent, updateEvent, deleteEvent } = useCalendar()
  const [tab, setTab] = useState('mes')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', date: today(), time: '', duration: '60', tag: 'Personal' as CalendarEvent['tag'] })
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)
  const [saving, setSaving] = useState(false)
  const [eventError, setEventError] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    const start = new Date(year, month, 1).toISOString().split('T')[0]
    const end = new Date(year, month + 1, 0).toISOString().split('T')[0]
    fetchEvents(start, end)
  }, [year, month, fetchEvents])

  function prevMonth() { setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)) }
  function nextMonth() { setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)) }

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const offset = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.date === dateStr)
  }

  const todayStr = today()

  // Agenda: group events by date
  const agendaEvents = events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return (a.time ?? '').localeCompare(b.time ?? '')
  })

  const groupedByDate: Record<string, CalendarEvent[]> = {}
  agendaEvents.forEach(ev => {
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
    }
    const err = editEvent ? await updateEvent(editEvent.id, payload) : await addEvent(payload)
    setSaving(false)
    if (err) { setEventError(err); return }
    const [y, m] = form.date.split('-').map(Number)
    const start = `${y}-${String(m).padStart(2, '0')}-01`
    const end = new Date(y, m, 0).toISOString().split('T')[0]
    await fetchEvents(start, end)
    setModalOpen(false)
    setEditEvent(null)
    setForm({ title: '', date: today(), time: '', duration: '60', tag: 'Personal' })
  }

  function openNew(date?: string) {
    setEditEvent(null)
    setForm({ title: '', date: date ?? today(), time: '', duration: '60', tag: 'Personal' })
    setModalOpen(true)
  }

  function openEdit(ev: CalendarEvent) {
    setEditEvent(ev)
    setForm({ title: ev.title, date: ev.date, time: ev.time ?? '', duration: String(ev.duration ?? 60), tag: ev.tag })
    setModalOpen(true)
  }

  if (loading) return <div style={{ color: 'var(--text-tertiary)', padding: 40 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }} className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Calendario</h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>Tus eventos y compromisos</p>
        </div>
        <Btn variant="primary" onClick={() => openNew()}>+ Nuevo evento</Btn>
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
                const dayEvents = getEventsForDay(day)
                const isToday = dateStr === todayStr
                const isSelected = dateStr === selectedDay
                return (
                  <div
                    key={day}
                    className="cal-cell"
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    style={{
                      height: 80,
                      overflow: 'hidden',
                      padding: '8px 6px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--accent-muted)' : isToday ? 'var(--bg-hover)' : 'var(--bg-elevated)',
                      border: `1px solid ${isToday ? 'var(--accent)' : isSelected ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{
                      fontSize: 13, fontWeight: isToday ? 700 : 400,
                      color: isToday ? 'var(--accent)' : 'var(--text-primary)',
                      marginBottom: 4,
                    }}>{day}</div>
                    {dayEvents.slice(0, 2).map(ev => (
                      <div key={ev.id} style={{
                        fontSize: 10, fontWeight: 500,
                        padding: '2px 4px', borderRadius: 3, marginBottom: 2,
                        background: `${TAG_COLORS[ev.tag] ?? 'var(--accent)'}22`,
                        color: TAG_COLORS[ev.tag] ?? 'var(--accent)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ev.time?.slice(0,5) ?? ''} {ev.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>+{dayEvents.length - 2} más</div>}
                  </div>
                )
              })}
            </div>

            {/* Selected day or today */}
            {(selectedDay || todayStr) && (() => {
              const showDate = selectedDay ?? todayStr
              const showEvents = events.filter(e => e.date === showDate)
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
                      {showEvents.map(ev => (
                        <div key={ev.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{ width: 3, height: 40, borderRadius: 2, background: TAG_COLORS[ev.tag] ?? 'var(--accent)', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>{ev.title}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                              {ev.time ? ev.time.slice(0, 5) : 'Todo el día'}{ev.duration ? ` · ${ev.duration}min` : ''} · {ev.tag}
                            </div>
                          </div>
                          <Btn variant="ghost" size="sm" onClick={() => openEdit(ev)}>✎</Btn>
                          <Btn variant="danger" size="sm" onClick={async () => { await deleteEvent(ev.id); fetchEvents(`${year}-${String(month + 1).padStart(2, '0')}-01`, new Date(year, month + 1, 0).toISOString().split('T')[0]) }}>✕</Btn>
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
                      {dayEvs.map(ev => (
                        <div key={ev.id} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <div style={{ width: 3, height: 44, borderRadius: 2, background: TAG_COLORS[ev.tag] ?? 'var(--accent)', flexShrink: 0 }} />
                          <div style={{ width: 52, fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>
                            {ev.time?.slice(0, 5) ?? '—'}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>{ev.title}</div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                              {ev.duration && <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{ev.duration}min</span>}
                              <span style={{
                                fontSize: 11, padding: '1px 6px', borderRadius: 3,
                                background: `${TAG_COLORS[ev.tag] ?? 'var(--accent)'}22`,
                                color: TAG_COLORS[ev.tag] ?? 'var(--accent)',
                              }}>{ev.tag}</span>
                            </div>
                          </div>
                          <Btn variant="ghost" size="sm" onClick={() => openEdit(ev)}>✎</Btn>
                          <Btn variant="danger" size="sm" onClick={async () => { await deleteEvent(ev.id); fetchEvents(`${year}-${String(month + 1).padStart(2, '0')}-01`, new Date(year, month + 1, 0).toISOString().split('T')[0]) }}>✕</Btn>
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

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditEvent(null); setEventError(null) }} title={editEvent ? 'Editar evento' : 'Nuevo evento'} size="sm">
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
          {eventError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>
              {eventError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Btn variant="ghost" type="button" onClick={() => { setModalOpen(false); setEditEvent(null); setEventError(null) }}>Cancelar</Btn>
            <Btn variant="primary" type="submit" loading={saving}>{editEvent ? 'Guardar' : 'Crear evento'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
