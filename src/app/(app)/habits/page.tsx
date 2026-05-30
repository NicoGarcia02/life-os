'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import TabBar from '@/components/ui/TabBar'
import ProgressBar from '@/components/ui/ProgressBar'
import DateNav from '@/components/ui/DateNav'
import SectionHeader from '@/components/ui/SectionHeader'
import StatCard from '@/components/ui/StatCard'
import Modal from '@/components/ui/Modal'
import Btn from '@/components/ui/Btn'
import { Input } from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { today, addDays, getDaysInRange, getWeekRange, formatDate, HABIT_EMOJI_OPTIONS } from '@/lib/utils'
import type { Habit, HabitEntry } from '@/lib/types'

const DAYS_ES = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export default function HabitsPage() {
  const supabase = createClient()
  const [tab, setTab] = useState('dia')
  const [selectedDate, setSelectedDate] = useState(today())
  const [habits, setHabits] = useState<Habit[]>([])
  const [entries, setEntries] = useState<HabitEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ name: '', emoji: '✅', weekly_goal: 7 })
  const [saving, setSaving] = useState(false)
  const [habitError, setHabitError] = useState<string | null>(null)

  const { start: weekStart, end: weekEnd } = getWeekRange()
  const monthStart = `${today().slice(0, 7)}-01`
  const monthEnd = (() => {
    const d = new Date(today().slice(0, 7) + '-01')
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
  })()

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const rangeEnd = today()
    const [habitsRes, entriesRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).eq('active', true).order('created_at'),
      supabase.from('habit_entries').select('*').eq('user_id', user.id).gte('date', monthStart).lte('date', rangeEnd),
    ])
    if (habitsRes.error) console.error('[habits] fetchHabits error:', { message: habitsRes.error.message, code: habitsRes.error.code })
    if (entriesRes.error) console.error('[habits] fetchEntries error:', { message: entriesRes.error.message, code: entriesRes.error.code })
    console.log(`[habits] rango ${monthStart} → ${rangeEnd} | hábitos: ${habitsRes.data?.length ?? 'ERR'} | entradas: ${entriesRes.data?.length ?? 'ERR'}`)
    console.log('[habits] habits data:', habitsRes.data)
    console.log('[habits] entries data:', entriesRes.data)
    if (habitsRes.data !== null) setHabits(habitsRes.data)
    if (entriesRes.data !== null) setEntries(entriesRes.data)
    setLoading(false)
  }, [monthStart])

  useEffect(() => { fetchAll() }, [fetchAll])
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchAll() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchAll])

  async function toggleEntry(habitId: string, date: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const existing = entries.find(e => e.habit_id === habitId && e.date === date && e.completed)
    if (existing) {
      const { error } = await supabase.from('habit_entries').delete().eq('habit_id', habitId).eq('date', date)
      if (error) { console.error('[habits] delete entry error:', { message: error.message, code: error.code }); return }
      setEntries(prev => prev.filter(e => !(e.habit_id === habitId && e.date === date)))
    } else {
      const { data, error } = await supabase.from('habit_entries').upsert(
        { habit_id: habitId, user_id: user.id, date, completed: true },
        { onConflict: 'habit_id,date' }
      ).select().single()
      if (error) { console.error('[habits] upsert entry error:', { message: error.message, code: error.code }); return }
      if (data) setEntries(prev => [...prev.filter(e => !(e.habit_id === habitId && e.date === date)), data])
    }
  }

  async function addHabit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setHabitError(null)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('[habits] auth error:', authError)
      setHabitError('No autenticado. Iniciá sesión nuevamente.')
      return
    }
    setSaving(true)
    const payload = { user_id: user.id, name: form.name.trim(), emoji: form.emoji, weekly_goal: form.weekly_goal, active: true }
    console.log('[habits] inserting habit:', payload)
    const { error } = await supabase.from('habits').insert(payload)
    setSaving(false)
    if (error) {
      const errAny = error as unknown
      const errStr = JSON.stringify(errAny, Object.getOwnPropertyNames(errAny instanceof Object ? errAny : {}))
      console.error('[habits] insert error (raw):', errAny)
      console.error('[habits] insert error (all props):', errStr)
      const msg = (error as { message?: string }).message || String(errAny) || 'Error al crear el habito'
      setHabitError(msg)
      return
    }
    setForm({ name: '', emoji: '✅', weekly_goal: 7 })
    setHabitError(null)
    setModalOpen(false)
    await fetchAll()
  }

  async function deleteHabit(id: string) {
    await supabase.from('habits').update({ active: false }).eq('id', id)
    await fetchAll()
  }

  // Day tab helpers
  const activeHabitIds = new Set(habits.map(h => h.id))
  const dayEntries = entries.filter(e => e.date === selectedDate && e.completed && activeHabitIds.has(e.habit_id))
  const dayPct = habits.length > 0 ? (dayEntries.length / habits.length) * 100 : 0

  // Week tab helpers
  const weekDays = getDaysInRange(weekStart, weekEnd)
  const getWeeklyCount = (habitId: string) => entries.filter(e => e.habit_id === habitId && e.date >= weekStart && e.date <= weekEnd && e.completed).length

  // Weekly streak: consecutive weeks where weekly_goal was met
  const getWeeklyStreak = (habit: Habit) => {
    let streak = 0
    for (let w = 0; w <= 12; w++) {
      const { start, end } = getWeekRange(-w)
      const count = entries.filter(e => e.habit_id === habit.id && e.date >= start && e.date <= end && e.completed).length
      if (count >= habit.weekly_goal) streak++
      else break
    }
    return streak
  }

  // Month heatmap
  const monthDays = getDaysInRange(monthStart, monthEnd)
  const getDayScore = (date: string) => {
    if (habits.length === 0) return 0
    const completed = entries.filter(e => e.date === date && e.completed && activeHabitIds.has(e.habit_id)).length
    return Math.round((completed / habits.length) * 100)
  }

  // Debug: log entries state when month tab is active (runs once after entries change)
  if (tab === 'mes') {
    console.log('[habits:mes] entries en state:', entries.length, entries.slice(0, 5))
    console.log('[habits:mes] monthStart:', monthStart, '| monthEnd:', monthEnd)
    console.log('[habits:mes] scores días 1-5:', monthDays.slice(0, 5).map(d => ({ day: d, score: getDayScore(d) })))
  }

  // Month stats
  const avgRate = monthDays.slice(0, new Date().getDate()).reduce((s, d) => s + getDayScore(d), 0) / new Date().getDate()
  const perfectWeeks = (() => {
    let count = 0
    for (let w = 0; w < 4; w++) {
      const { start, end } = getWeekRange(-w)
      const allMet = habits.every(h => entries.filter(e => e.habit_id === h.id && e.date >= start && e.date <= end && e.completed).length >= h.weekly_goal)
      if (allMet && habits.length > 0) count++
    }
    return count
  })()

  if (loading) return <div style={{ color: 'var(--text-tertiary)', padding: 40 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }} className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Hábitos</h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>Tu sistema de hábitos diarios</p>
        </div>
        <Btn variant="primary" onClick={() => setModalOpen(true)}>+ Nuevo hábito</Btn>
      </div>

      <TabBar
        tabs={[{ id: 'dia', label: 'Día' }, { id: 'semana', label: 'Semana' }, { id: 'mes', label: 'Mes' }]}
        active={tab}
        onChange={setTab}
      />

      <div style={{ marginTop: 24 }}>
        {/* TAB DÍA */}
        {tab === 'dia' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <DateNav date={selectedDate} onChange={setSelectedDate} />
              <ProgressBar value={dayEntries.length} total={habits.length || 1} showLabel height={8} style={{ minWidth: 200 }} />
            </div>
            {habits.length === 0 ? (
              <EmptyState icon="✅" title="Sin hábitos todavía" description="Creá tu primer hábito para empezar a trackear tu progreso." action={{ label: '+ Nuevo hábito', onClick: () => setModalOpen(true) }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {habits.map((habit, i) => {
                  const done = entries.some(e => e.habit_id === habit.id && e.date === selectedDate && e.completed)
                  const weekCount = getWeeklyCount(habit.id)
                  const streak = getWeeklyStreak(habit)
                  return (
                    <div key={habit.id}
                      className={`card animate-fade stagger-${Math.min(i + 1, 7)}`}
                      style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                      onClick={() => toggleEntry(habit.id, selectedDate)}
                    >
                      <div className={`habit-check ${done ? 'checked' : ''}`}>
                        {done && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16 }}>{habit.emoji}</span>
                          <span style={{ fontSize: 15, fontWeight: 500, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>{habit.name}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 3, display: 'flex', gap: 12 }}>
                          <span>Meta: {habit.weekly_goal}/sem</span>
                          <span style={{ color: weekCount >= habit.weekly_goal ? 'var(--green)' : 'var(--text-secondary)' }}>Esta semana: {weekCount}/{habit.weekly_goal}</span>
                          {streak > 0 && <span>🔥 {streak} semana{streak > 1 ? 's' : ''}</span>}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); deleteHabit(habit.id) }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 14, padding: '4px 8px', borderRadius: 6 }}
                      >✕</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB SEMANA */}
        {tab === 'semana' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 12 }}>
                Semana del {formatDate(weekStart, { day: 'numeric', month: 'short' })} al {formatDate(weekEnd, { day: 'numeric', month: 'short' })}
              </div>
              <div className="habits-week-grid" style={{ gap: 4, marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Hábito</div>
                {DAYS_ES.map(d => <div key={d} style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>{d}</div>)}
              </div>
              {habits.length === 0 ? (
                <EmptyState icon="✅" title="Sin hábitos" action={{ label: '+ Nuevo hábito', onClick: () => setModalOpen(true) }} />
              ) : habits.map((habit, i) => {
                const weekCount = getWeeklyCount(habit.id)
                const daysLeft = weekDays.filter(d => d >= today()).length
                const status = weekCount >= habit.weekly_goal
                  ? '✓ Meta cumplida'
                  : daysLeft > 0 && (habit.weekly_goal - weekCount) <= daysLeft
                    ? `En camino (${weekCount}/${habit.weekly_goal})`
                    : `⚠️ Faltan ${habit.weekly_goal - weekCount} en ${daysLeft} días`
                return (
                  <div key={habit.id} className={`animate-fade stagger-${Math.min(i + 1, 7)}`} style={{ marginBottom: 16 }}>
                    <div className="habits-week-grid" style={{ gap: 4, marginBottom: 6, alignItems: 'center' }}>
                      <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{habit.emoji}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{habit.name}</span>
                      </div>
                      {weekDays.map(day => {
                        const done = entries.some(e => e.habit_id === habit.id && e.date === day && e.completed)
                        const isToday = day === today()
                        return (
                          <div key={day}
                            onClick={() => toggleEntry(habit.id, day)}
                            style={{
                              height: 32, borderRadius: 'var(--radius-sm)',
                              background: done ? 'var(--accent-muted)' : 'var(--bg-active)',
                              border: `1px solid ${done ? 'var(--accent)' : isToday ? 'var(--border-default)' : 'transparent'}`,
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 14,
                            }}
                          >
                            {done && <span style={{ color: 'var(--accent)' }}>✓</span>}
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <ProgressBar value={weekCount} total={habit.weekly_goal} height={4} style={{ flex: 1 }} />
                      <span style={{ fontSize: 12, color: status.startsWith('✓') ? 'var(--green)' : status.startsWith('⚠️') ? 'var(--yellow)' : 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{status}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB MES */}
        {tab === 'mes' && (
          <div>
            <div className="grid-3" style={{ gap: 12, marginBottom: 24 }}>
              <StatCard label="Tasa promedio" value={`${Math.round(avgRate)}%`} />
              <StatCard label="Semanas perfectas" value={perfectWeeks} />
              <StatCard label="Hábitos activos" value={habits.length} />
            </div>
            {/* Heatmap */}
            <SectionHeader title={`Mapa del mes — ${new Date(today()).toLocaleDateString('es-AR', { month: 'long' })}`} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {DAYS_ES.map(d => <div key={d} style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', paddingBottom: 4 }}>{d}</div>)}
              {/* Empty cells for start of month */}
              {(() => {
                const firstDay = new Date(monthStart + 'T00:00:00').getDay()
                const offset = firstDay === 0 ? 6 : firstDay - 1
                return Array.from({ length: offset }).map((_, i) => <div key={`e-${i}`} />)
              })()}
              {monthDays.map(day => {
                const score = getDayScore(day)
                const isFuture = day > today()
                const opacity = isFuture ? 0 : score === 0 ? 0.15 : score <= 33 ? 0.35 : score <= 66 ? 0.65 : 1
                return (
                  <div key={day} title={`${formatDate(day)}: ${score}%`} style={{
                    aspectRatio: '1',
                    borderRadius: 4,
                    background: isFuture ? 'var(--bg-surface)' : score === 0 ? 'var(--bg-active)' : `rgba(74,222,128,${opacity})`,
                    border: day === today() ? '2px solid var(--accent)' : '1px solid transparent',
                    cursor: 'default',
                  }} />
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal nuevo hábito */}
      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setHabitError(null) }} title="Nuevo hábito" size="sm">
        <form onSubmit={addHabit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flexShrink: 0 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Emoji</label>
              <div style={{ width: 52, height: 42, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, background: 'var(--bg-root)' }}>
                {form.emoji}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Nombre del hábito" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="Ej: Meditar" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Elegí un emoji</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px', background: 'var(--bg-root)', borderRadius: 'var(--radius-sm)', maxHeight: 130, overflowY: 'auto' }}>
              {HABIT_EMOJI_OPTIONS.map(emoji => (
                <button key={emoji} type="button" onClick={() => setForm(p => ({ ...p, emoji }))}
                  style={{ fontSize: 20, background: form.emoji === emoji ? 'var(--accent-muted)' : 'none', border: form.emoji === emoji ? '1px solid var(--accent)' : '1px solid transparent', borderRadius: 6, padding: '4px 6px', cursor: 'pointer' }}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
              Meta semanal: {form.weekly_goal} día{form.weekly_goal !== 1 ? 's' : ''} / semana
            </label>
            <input type="range" min={1} max={7} value={form.weekly_goal}
              onChange={e => setForm(p => ({ ...p, weekly_goal: parseInt(e.target.value) }))}
              style={{ width: '100%', accentColor: 'var(--accent)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
              <span>1 día</span><span>7 días</span>
            </div>
          </div>
          {habitError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>
              {habitError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Btn variant="ghost" type="button" onClick={() => { setModalOpen(false); setHabitError(null) }}>Cancelar</Btn>
            <Btn variant="primary" type="submit" loading={saving}>Crear hábito</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
