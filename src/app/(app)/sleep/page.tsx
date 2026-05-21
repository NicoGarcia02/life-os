'use client'
import { useState } from 'react'
import TabBar from '@/components/ui/TabBar'
import StatCard from '@/components/ui/StatCard'
import SectionHeader from '@/components/ui/SectionHeader'
import Modal from '@/components/ui/Modal'
import Btn from '@/components/ui/Btn'
import { Input } from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { useSleep } from '@/hooks/useSleep'
import { today, formatDate, calcHoursSlept, entryHours, getWeekRange, getDaysInRange } from '@/lib/utils'
import type { SleepEntry } from '@/lib/types'

const DAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function SleepBarsChart({ entries }: { entries: SleepEntry[] }) {
  const data = entries.slice(0, 28).reverse()
  if (!data.length) return <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Sin datos</div>
  const max = 10
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
      {data.map((e, i) => {
        const h = entryHours(e)
        const bh = (h / max) * 60
        const color = h >= 7 ? 'var(--green)' : h >= 6 ? 'var(--yellow)' : 'var(--red)'
        return (
          <div key={i} title={`${e.date}: ${h}h`} style={{
            flex: 1, height: bh, borderRadius: 2,
            background: color, opacity: 0.8,
            minWidth: 4,
          }} />
        )
      })}
    </div>
  )
}

function WeeklyBarsChart({ entries, weekStart, weekEnd }: { entries: SleepEntry[], weekStart: string, weekEnd: string }) {
  const entriesByDate = new Map(entries.map(e => [e.date, e]))
  const weekDays = getDaysInRange(weekStart, weekEnd)
  const max = 10
  const todayStr = today()
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
        {weekDays.map(day => {
          const entry = entriesByDate.get(day)
          const h = entry ? entryHours(entry) : 0
          const bh = h > 0 ? (h / max) * 80 : 4
          const color = h >= 7 ? 'var(--green)' : h >= 6 ? 'var(--yellow)' : h > 0 ? 'var(--red)' : 'var(--bg-active)'
          return (
            <div key={day} title={h > 0 ? `${h}h` : 'Sin registro'} style={{
              flex: 1, height: bh, borderRadius: 4, background: color,
              border: day === todayStr ? '2px solid var(--accent)' : 'none',
            }} />
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        {weekDays.map((day, i) => {
          const wEntry = entriesByDate.get(day)
          const h = wEntry ? entryHours(wEntry) : 0
          return (
            <div key={day} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: day === todayStr ? 'var(--accent)' : 'var(--text-tertiary)' }}>{DAYS_SHORT[i]}</div>
              {h > 0 && <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{h}h</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonthlyBarsChart({ entries }: { entries: SleepEntry[] }) {
  const entriesByDate = new Map(entries.map(e => [e.date, e]))
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayNum = now.getDate()
  const max = 10
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 60 }}>
        {Array.from({ length: daysInMonth }, (_, i) => {
          const dayNum = i + 1
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
          const mEntry = entriesByDate.get(dateStr)
          const h = mEntry ? entryHours(mEntry) : 0
          const isFuture = dayNum > todayNum
          const bh = h > 0 ? (h / max) * 60 : 3
          const color = isFuture ? 'var(--bg-active)' : h >= 7 ? 'var(--green)' : h >= 6 ? 'var(--yellow)' : h > 0 ? 'var(--red)' : 'var(--bg-active)'
          return (
            <div key={dayNum} title={`Día ${dayNum}${h > 0 ? `: ${h}h` : ''}`} style={{
              flex: 1, height: bh, borderRadius: 2, background: color, opacity: isFuture ? 0.35 : 1,
            }} />
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: 'var(--text-tertiary)' }}>
        <span>1</span>
        <span>{Math.round(daysInMonth / 2)}</span>
        <span>{daysInMonth}</span>
      </div>
    </div>
  )
}

const LEGEND = (
  <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12 }}>
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: 'var(--green)', borderRadius: 2, display: 'inline-block' }} /> ≥7h</span>
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: 'var(--yellow)', borderRadius: 2, display: 'inline-block' }} /> 6-7h</span>
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, background: 'var(--red)', borderRadius: 2, display: 'inline-block' }} /> &lt;6h</span>
  </div>
)

export default function SleepPage() {
  const { entries, loading, upsertEntry, deleteEntry } = useSleep()
  const [tab, setTab] = useState('registro')
  const [modalOpen, setModalOpen] = useState(false)
  const [editEntry, setEditEntry] = useState<SleepEntry | null>(null)
  const [form, setForm] = useState({ date: today(), sleep_time: '23:00', wake_time: '07:00', quality: 4 })
  const [saving, setSaving] = useState(false)
  const [sleepError, setSleepError] = useState<string | null>(null)

  function openNew() {
    setEditEntry(null)
    setSleepError(null)
    setForm({ date: today(), sleep_time: '23:00', wake_time: '07:00', quality: 4 })
    setModalOpen(true)
  }

  function openEdit(e: SleepEntry) {
    setEditEntry(e)
    setSleepError(null)
    setForm({ date: e.date, sleep_time: e.sleep_time ?? '23:00', wake_time: e.wake_time ?? '07:00', quality: e.quality ?? 4 })
    setModalOpen(true)
  }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault()
    setSaving(true)
    setSleepError(null)
    const errorMsg = await upsertEntry({ ...form, ...(editEntry ? { id: editEntry.id } : {}) })
    setSaving(false)
    if (errorMsg) {
      setSleepError(errorMsg)
      return
    }
    setModalOpen(false)
  }

  // Registro stats (últimos 7)
  const last7 = entries.slice(0, 7)
  const avgHours = last7.length ? Math.round((last7.reduce((s, e) => s + entryHours(e), 0) / last7.length) * 10) / 10 : 0
  const avgQuality = last7.length ? Math.round((last7.reduce((s, e) => s + (e.quality ?? 0), 0) / last7.length) * 10) / 10 : 0
  const consistencyPct = last7.length ? Math.round((last7.filter(e => entryHours(e) >= 7).length / last7.length) * 100) : 0

  // Tendencias
  const avgBed = (() => {
    const beds = entries.slice(0, 28).filter(e => e.sleep_time)
    if (!beds.length) return null
    const totalMins = beds.reduce((s, e) => {
      const [h, m] = (e.sleep_time ?? '0:0').split(':').map(Number)
      return s + ((h < 12 ? h + 24 : h) * 60 + m)
    }, 0) / beds.length
    const h = Math.floor(totalMins / 60) % 24
    const m = Math.round(totalMins % 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  })()

  const avgWake = (() => {
    const wakes = entries.slice(0, 28).filter(e => e.wake_time)
    if (!wakes.length) return null
    const totalMins = wakes.reduce((s, e) => {
      const [h, m] = (e.wake_time ?? '7:0').split(':').map(Number)
      return s + (h * 60 + m)
    }, 0) / wakes.length
    const h = Math.floor(totalMins / 60)
    const m = Math.round(totalMins % 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  })()

  // Semanal stats
  const { start: weekStart, end: weekEnd } = getWeekRange()
  const weekEntries = entries.filter(e => e.date >= weekStart && e.date <= weekEnd)
  const weekAvgHours = weekEntries.length
    ? Math.round((weekEntries.reduce((s, e) => s + entryHours(e), 0) / weekEntries.length) * 10) / 10
    : 0
  const weekAvgQuality = weekEntries.length
    ? Math.round((weekEntries.reduce((s, e) => s + (e.quality ?? 0), 0) / weekEntries.length) * 10) / 10
    : 0
  const sortedByHours = [...weekEntries].sort((a, b) => entryHours(b) - entryHours(a))
  const bestNight = sortedByHours[0] ?? null
  const worstNight = sortedByHours.length > 1 ? sortedByHours[sortedByHours.length - 1] : null

  // Mensual stats
  const nowDate = new Date()
  const thisMonthStr = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`
  const prevMonthDate = new Date(nowDate.getFullYear(), nowDate.getMonth() - 1, 1)
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`
  const thisMonthEntries = entries.filter(e => e.date.startsWith(thisMonthStr))
  const prevMonthEntries = entries.filter(e => e.date.startsWith(prevMonthStr))
  const monthAvgHours = thisMonthEntries.length
    ? Math.round((thisMonthEntries.reduce((s, e) => s + entryHours(e), 0) / thisMonthEntries.length) * 10) / 10
    : 0
  const prevMonthAvgHours = prevMonthEntries.length
    ? Math.round((prevMonthEntries.reduce((s, e) => s + entryHours(e), 0) / prevMonthEntries.length) * 10) / 10
    : 0
  const monthConsistency = thisMonthEntries.length
    ? Math.round((thisMonthEntries.filter(e => entryHours(e) >= 7).length / thisMonthEntries.length) * 100)
    : 0

  if (loading) return <div style={{ color: 'var(--text-tertiary)', padding: 40 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }} className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Sueño</h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>Registrá y analizá tu descanso</p>
        </div>
        <Btn variant="primary" onClick={openNew}>+ Registrar</Btn>
      </div>

      <TabBar
        tabs={[
          { id: 'registro', label: 'Registro' },
          { id: 'semanal', label: 'Semanal' },
          { id: 'mensual', label: 'Mensual' },
          { id: 'tendencias', label: 'Tendencias' },
        ]}
        active={tab}
        onChange={setTab}
      />

      <div style={{ marginTop: 24 }}>
        {tab === 'registro' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              <StatCard label="Promedio semanal" value={`${avgHours}h`} trend="últimos 7 días" trendUp={avgHours >= 7} trendDown={avgHours < 6} />
              <StatCard label="Calidad promedio" value={`${avgQuality}/5`} trendUp={avgQuality >= 4} />
              <StatCard label="Consistencia" value={`${consistencyPct}%`} trend="noches ≥7h" trendUp={consistencyPct >= 70} />
            </div>

            {entries.length === 0 ? (
              <EmptyState icon="🌙" title="Sin registros de sueño" description="Empezá registrando cuánto dormiste anoche." action={{ label: '+ Registrar', onClick: openNew }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {entries.slice(0, 14).map((e, i) => {
                  const h = entryHours(e)
                  const color = h >= 7 ? 'var(--green)' : h >= 6 ? 'var(--yellow)' : 'var(--red)'
                  return (
                    <div key={e.id} className={`card animate-fade stagger-${Math.min(i + 1, 7)}`}
                      style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ minWidth: 100, fontSize: 13, color: 'var(--text-secondary)' }}>
                        {formatDate(e.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      {e.sleep_time && e.wake_time && (
                        <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', minWidth: 120 }}>
                          {e.sleep_time.slice(0, 5)} → {e.wake_time.slice(0, 5)}
                        </div>
                      )}
                      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color, minWidth: 50 }}>
                        {h}h
                      </div>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {[1, 2, 3, 4, 5].map(n => (
                          <div key={n} style={{ width: 10, height: 10, borderRadius: '50%', background: n <= (e.quality ?? 0) ? 'var(--accent)' : 'var(--bg-active)' }} />
                        ))}
                      </div>
                      <div style={{ flex: 1 }} />
                      <Btn variant="ghost" size="sm" onClick={() => openEdit(e)}>Editar</Btn>
                      <Btn variant="danger" size="sm" onClick={() => deleteEntry(e.id)}>✕</Btn>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'semanal' && (
          <div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Semana del {formatDate(weekStart, { day: 'numeric', month: 'short' })} al {formatDate(weekEnd, { day: 'numeric', month: 'short' })}
            </div>
            {weekEntries.length === 0 ? (
              <EmptyState icon="🌙" title="Sin registros esta semana" description="Registrá tu sueño para ver el resumen semanal." action={{ label: '+ Registrar', onClick: openNew }} />
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 24 }}>
                  <StatCard label="Promedio horas" value={`${weekAvgHours}h`} trendUp={weekAvgHours >= 7} trendDown={weekAvgHours < 6} />
                  <StatCard label="Calidad promedio" value={`${weekAvgQuality}/5`} trendUp={weekAvgQuality >= 4} />
                  {bestNight && (
                    <StatCard label="Mejor noche" value={`${entryHours(bestNight)}h`} trend={formatDate(bestNight.date, { weekday: 'long' })} trendUp />
                  )}
                  {worstNight && (
                    <StatCard label="Peor noche" value={`${entryHours(worstNight)}h`} trend={formatDate(worstNight.date, { weekday: 'long' })} trendDown />
                  )}
                </div>
                <div className="card" style={{ padding: 20 }}>
                  <SectionHeader title="Horas por día" />
                  <WeeklyBarsChart entries={weekEntries} weekStart={weekStart} weekEnd={weekEnd} />
                  {LEGEND}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'mensual' && (
          <div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {nowDate.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
            </div>
            {thisMonthEntries.length === 0 ? (
              <EmptyState icon="📅" title="Sin registros este mes" description="Registrá tu sueño para ver el resumen mensual." action={{ label: '+ Registrar', onClick: openNew }} />
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                  <StatCard label="Promedio del mes" value={`${monthAvgHours}h`} trendUp={monthAvgHours >= 7} trendDown={monthAvgHours < 6} />
                  <StatCard label="Noches registradas" value={thisMonthEntries.length} />
                  <StatCard label="Consistencia" value={`${monthConsistency}%`} trend="noches ≥7h" trendUp={monthConsistency >= 70} />
                </div>

                {prevMonthAvgHours > 0 && (
                  <div className="card" style={{ padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                      vs {prevMonthDate.toLocaleDateString('es-AR', { month: 'long' })}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{prevMonthAvgHours}h promedio</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: monthAvgHours >= prevMonthAvgHours ? 'var(--green)' : 'var(--red)' }}>
                        {monthAvgHours >= prevMonthAvgHours ? '↑' : '↓'} {Math.abs(monthAvgHours - prevMonthAvgHours).toFixed(1)}h
                      </span>
                    </div>
                  </div>
                )}

                <div className="card" style={{ padding: 20 }}>
                  <SectionHeader title="Horas por día" />
                  <MonthlyBarsChart entries={thisMonthEntries} />
                  {LEGEND}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'tendencias' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Hora promedio de dormir</div>
                <div style={{ fontSize: 40, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-accent)' }}>{avgBed ?? '—'}</div>
              </div>
              <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Hora promedio de despertar</div>
                <div style={{ fontSize: 40, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{avgWake ?? '—'}</div>
              </div>
            </div>
            <div className="card" style={{ padding: 20 }}>
              <SectionHeader title="Horas de sueño — últimos 28 días" />
              <SleepBarsChart entries={entries} />
              {LEGEND}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setSleepError(null) }} title={editEntry ? 'Editar registro' : 'Nuevo registro de sueño'} size="sm">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Fecha" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} max={today()} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Me dormí" type="time" value={form.sleep_time} onChange={e => setForm(p => ({ ...p, sleep_time: e.target.value }))} />
            <Input label="Me desperté" type="time" value={form.wake_time} onChange={e => setForm(p => ({ ...p, wake_time: e.target.value }))} />
          </div>
          <div style={{ background: 'var(--bg-active)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-accent)' }}>
            {calcHoursSlept(form.sleep_time, form.wake_time)}h de sueño
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Calidad</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(q => (
                <button key={q} type="button" onClick={() => setForm(p => ({ ...p, quality: q }))} style={{
                  flex: 1, padding: '10px 0',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${form.quality === q ? 'var(--accent)' : 'var(--border-default)'}`,
                  background: form.quality === q ? 'var(--accent-muted)' : 'var(--bg-root)',
                  color: form.quality === q ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 16,
                }}>{q}</button>
              ))}
            </div>
          </div>
          {sleepError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>
              {sleepError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Btn variant="ghost" type="button" onClick={() => { setModalOpen(false); setSleepError(null) }}>Cancelar</Btn>
            <Btn variant="primary" type="submit" loading={saving}>Guardar</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
