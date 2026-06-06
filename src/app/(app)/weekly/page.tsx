'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import SectionHeader from '@/components/ui/SectionHeader'
import ProgressBar from '@/components/ui/ProgressBar'
import ScoreRing from '@/components/ui/ScoreRing'
import { getWeekRange, getDaysInRange, formatDate, formatCurrency, calcDailyScore, scoreColor, entryHours } from '@/lib/utils'
import type { Habit, HabitEntry, SleepEntry, Task, Transaction, DailyClosing } from '@/lib/types'

const RATING_EMOJIS: Record<number, string> = { 1: '😫', 2: '😕', 3: '😐', 4: '🙂', 5: '🤩' }

function WeekNav({ offset, onChange }: { offset: number; onChange: (o: number) => void }) {
  const { start, end } = getWeekRange(offset)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button onClick={() => onChange(offset - 1)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', width: 32, height: 32, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 14 }}>‹</button>
      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', minWidth: 220, textAlign: 'center' }}>
        {offset === 0 ? 'Esta semana — ' : ''}{formatDate(start, { day: 'numeric', month: 'short' })} al {formatDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
      <button onClick={() => onChange(offset + 1)} disabled={offset >= 0} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', width: 32, height: 32, cursor: offset >= 0 ? 'not-allowed' : 'pointer', color: offset >= 0 ? 'var(--text-tertiary)' : 'var(--text-secondary)', fontSize: 14, opacity: offset >= 0 ? 0.4 : 1 }}>›</button>
    </div>
  )
}

function BarChart({ data, max = 100, color = 'var(--accent)', labels }: { data: number[], max?: number, color?: string, labels?: string[] }) {
  const h = 60
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
      {data.map((v, i) => {
        const bh = Math.max(2, (v / Math.max(max, 1)) * h)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ height: bh, width: '100%', borderRadius: 3, background: color, opacity: 0.7 + (i / data.length) * 0.3 }} />
            {labels && <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{labels[i]}</span>}
          </div>
        )
      })}
    </div>
  )
}

export default function WeeklyPage() {
  const supabase = createClient()
  const [weekOffset, setWeekOffset] = useState(0)
  const [loading, setLoading] = useState(true)

  const [habits, setHabits] = useState<Habit[]>([])
  const [entries, setEntries] = useState<HabitEntry[]>([])
  const [sleepEntries, setSleepEntries] = useState<SleepEntry[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [closings, setClosings] = useState<DailyClosing[]>([])

  const { start: weekStart, end: weekEnd } = getWeekRange(weekOffset)
  const weekDays = getDaysInRange(weekStart, weekEnd)
  const dayLabels = weekDays.map(d => formatDate(d, { weekday: 'short' }))

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [habitsRes, entriesRes, sleepRes, tasksRes, txRes, closingsRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).eq('active', true),
      supabase.from('habit_entries').select('*').eq('user_id', user.id).gte('date', weekStart).lte('date', weekEnd),
      supabase.from('sleep_entries').select('*').eq('user_id', user.id).gte('date', weekStart).lte('date', weekEnd),
      supabase.from('tasks').select('*').eq('user_id', user.id),
      supabase.from('transactions').select('*, finance_categories(name, icon)').eq('user_id', user.id).gte('date', weekStart).lte('date', weekEnd),
      supabase.from('daily_closings').select('*').eq('user_id', user.id).gte('date', weekStart).lte('date', weekEnd).order('date'),
    ])

    setHabits(habitsRes.data ?? [])
    setEntries(entriesRes.data ?? [])
    setSleepEntries(sleepRes.data ?? [])
    setTasks(tasksRes.data ?? [])
    setTransactions(txRes.data ?? [])
    setClosings(closingsRes.data ?? [])
    setLoading(false)
  }, [weekStart, weekEnd])

  useEffect(() => { fetchAll() }, [fetchAll])
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchAll() }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchAll])

  // Scores per day
  const dayScores = weekDays.map(day => {
    const dayEntries = entries.filter(e => e.date === day && e.completed)
    const sleep = sleepEntries.find(s => s.date === day)
    const dayTasks = tasks.filter(t => t.due_date === day)
    return calcDailyScore({
      habitsCompleted: dayEntries.length,
      habitsTotal: habits.length,
      sleepHours: sleep ? entryHours(sleep) : null,
      tasksCompleted: dayTasks.filter(t => t.completed).length,
      tasksTotal: dayTasks.length,
    })
  })
  const avgScore = dayScores.length ? Math.round(dayScores.reduce((s, v) => s + v, 0) / dayScores.length) : 0

  // Habits
  const habitsMet = habits.filter(h => {
    const count = entries.filter(e => e.habit_id === h.id && e.completed).length
    return count >= h.weekly_goal
  }).length

  // Sleep
  const avgSleepHours = sleepEntries.length
    ? Math.round((sleepEntries.reduce((s, e) => s + entryHours(e), 0) / sleepEntries.length) * 10) / 10
    : 0
  const avgSleepQuality = sleepEntries.length
    ? Math.round((sleepEntries.reduce((s, e) => s + (e.quality ?? 0), 0) / sleepEntries.length) * 10) / 10
    : 0
  const bestNight = sleepEntries.reduce((best, e) => (!best || entryHours(e) > entryHours(best)) ? e : best, null as SleepEntry | null)
  const worstNight = sleepEntries.reduce((worst, e) => (!worst || entryHours(e) < entryHours(worst)) ? e : worst, null as SleepEntry | null)

  // Tasks
  const weekTasks = tasks.filter(t => t.due_date && t.due_date >= weekStart && t.due_date <= weekEnd)
  const weekTasksCompleted = weekTasks.filter(t => t.completed).length

  // Finances
  const weekExpense = transactions.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0)
  const topCat = (() => {
    const catMap: Record<string, { name: string; icon: string; total: number }> = {}
    transactions.filter(t => t.type === 'gasto' && t.category_id).forEach(t => {
      const cat = (t as any).finance_categories
      if (!cat) return
      if (!catMap[t.category_id!]) catMap[t.category_id!] = { name: cat.name, icon: cat.icon, total: 0 }
      catMap[t.category_id!].total += t.amount
    })
    return Object.values(catMap).sort((a, b) => b.total - a.total)[0] ?? null
  })()

  // Patterns
  const goodSleepDays = weekDays.filter(day => {
    const sleep = sleepEntries.find(s => s.date === day)
    return sleep && entryHours(sleep) >= 7
  })
  const goodSleepHabitPct = goodSleepDays.length > 0
    ? Math.round(goodSleepDays.reduce((s, day) => {
        const dayEntries = entries.filter(e => e.date === day && e.completed).length
        return s + (habits.length > 0 ? (dayEntries / habits.length) * 100 : 0)
      }, 0) / goodSleepDays.length)
    : null

  const bestDayScore = Math.max(...dayScores)
  const bestDayIndex = dayScores.indexOf(bestDayScore)
  const bestDay = weekDays[bestDayIndex]

  // Poor sleep habit completion (for comparison)
  const poorSleepDays = weekDays.filter(day => {
    const s = sleepEntries.find(e => e.date === day)
    return s && entryHours(s) < 7
  })
  const poorSleepHabitPct = poorSleepDays.length > 0
    ? Math.round(poorSleepDays.reduce((s, day) => {
        const n = entries.filter(e => e.date === day && e.completed).length
        return s + (habits.length > 0 ? (n / habits.length) * 100 : 0)
      }, 0) / poorSleepDays.length)
    : null

  // Score trend (Mon-Wed vs Thu-Sun)
  const validScores = dayScores.filter(s => s > 0)
  const firstHalf = dayScores.slice(0, 3).filter(s => s > 0)
  const secondHalf = dayScores.slice(3).filter(s => s > 0)
  const firstAvg = firstHalf.length ? firstHalf.reduce((a, b) => a + b) / firstHalf.length : 0
  const secondAvg = secondHalf.length ? secondHalf.reduce((a, b) => a + b) / secondHalf.length : 0
  const scoreTrend = firstHalf.length > 0 && secondHalf.length > 0 ? Math.round(secondAvg - firstAvg) : null

  // Mood vs performance
  const goodScoreDayRatings = weekDays
    .map((d, i) => ({ score: dayScores[i], rating: closings.find(c => c.date === d)?.day_rating }))
    .filter(x => x.score >= 70 && x.rating)
    .map(x => x.rating as number)
  const avgMoodHighScore = goodScoreDayRatings.length ? +(goodScoreDayRatings.reduce((a, b) => a + b) / goodScoreDayRatings.length).toFixed(1) : null

  if (loading) return <div style={{ color: 'var(--text-tertiary)', padding: 40 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }} className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Resumen semanal</h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>Una mirada a tu semana</p>
        </div>
        <WeekNav offset={weekOffset} onChange={setWeekOffset} />
      </div>

      {/* Score */}
      <div className="card" style={{ padding: 24, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
        <ScoreRing score={avgScore} size={100} label="promedio" />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Score por día</div>
          <BarChart data={dayScores} labels={dayLabels} color={scoreColor(avgScore)} />
        </div>
      </div>

      <div className="grid-2" style={{ gap: 16, marginBottom: 16 }}>
        {/* Hábitos */}
        <div className="card" style={{ padding: 20 }}>
          <SectionHeader title="Metas semanales" />
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', color: habitsMet === habits.length && habits.length > 0 ? 'var(--green)' : 'var(--accent)' }}>
              {habitsMet}/{habits.length}
            </span>
            <span style={{ fontSize: 14, color: 'var(--text-tertiary)', marginLeft: 8 }}>metas cumplidas</span>
          </div>
          {habits.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Sin hábitos configurados</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {habits.map(h => {
                const count = entries.filter(e => e.habit_id === h.id && e.completed).length
                const met = count >= h.weekly_goal
                return (
                  <div key={h.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {h.emoji} {h.name}
                      </span>
                      <span style={{ fontSize: 12, color: met ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                        {met ? '✓' : '✗'} {count}/{h.weekly_goal}
                      </span>
                    </div>
                    <ProgressBar value={count} total={h.weekly_goal} height={4} color={met ? 'var(--green)' : 'var(--red)'} />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sueño */}
        <div className="card" style={{ padding: 20 }}>
          <SectionHeader title="Sueño" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Promedio</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: avgSleepHours >= 7 ? 'var(--green)' : avgSleepHours >= 6 ? 'var(--yellow)' : 'var(--red)' }}>{avgSleepHours}h</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Calidad</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{avgSleepQuality}/5</div>
            </div>
          </div>
          {bestNight && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            🌟 Mejor noche: {entryHours(bestNight)}h el {formatDate(bestNight.date, { weekday: 'short', day: 'numeric' })}
          </div>}
          {worstNight && bestNight !== worstNight && <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
            😓 Peor noche: {entryHours(worstNight)}h el {formatDate(worstNight.date, { weekday: 'short', day: 'numeric' })}
          </div>}
          {sleepEntries.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Sin registros esta semana</div>}
        </div>

        {/* Tareas */}
        <div className="card" style={{ padding: 20 }}>
          <SectionHeader title="Tareas" />
          <div className="grid-3" style={{ gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Completadas</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--green)' }}>{weekTasksCompleted}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Total</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{weekTasks.length}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Tasa</div>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                {weekTasks.length ? Math.round((weekTasksCompleted / weekTasks.length) * 100) : 0}%
              </div>
            </div>
          </div>
          <ProgressBar value={weekTasksCompleted} total={weekTasks.length || 1} height={6} />
        </div>

        {/* Finanzas */}
        <div className="card" style={{ padding: 20 }}>
          <SectionHeader title="Finanzas" />
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>Gasto de la semana</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{formatCurrency(weekExpense)}</div>
          </div>
          {topCat && (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Categoría líder: {topCat.icon} {topCat.name} — {formatCurrency(topCat.total)}
            </div>
          )}
          {transactions.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Sin movimientos esta semana</div>}
        </div>
      </div>

      {/* Diario de la semana */}
      {closings.length > 0 && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <SectionHeader title="Diario de la semana" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {closings.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 4 }}>{formatDate(c.date, { weekday: 'short', day: 'numeric' })}</div>
                  <div style={{ fontSize: 28 }}>{c.day_rating ? RATING_EMOJIS[c.day_rating] : '—'}</div>
                </div>
                <div style={{ flex: 1 }}>
                  {c.journal ? (
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{c.journal}</p>
                  ) : (
                    <p style={{ fontSize: 13, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>Sin nota escrita</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patrones */}
      {(goodSleepHabitPct !== null || bestDay || scoreTrend !== null || validScores.length > 0) && (
        <div className="card" style={{ padding: 20 }}>
          <SectionHeader title="Patrones detectados" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {goodSleepHabitPct !== null && poorSleepHabitPct !== null && goodSleepDays.length > 0 && poorSleepDays.length > 0 && (
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                <span>😴</span>
                <span>Con +7h de sueño completaste <strong style={{ color: 'var(--green)' }}>{goodSleepHabitPct}%</strong> de hábitos; con menos, solo <strong style={{ color: goodSleepHabitPct > poorSleepHabitPct ? 'var(--red)' : 'var(--green)' }}>{poorSleepHabitPct}%</strong></span>
              </div>
            )}
            {goodSleepHabitPct !== null && (poorSleepHabitPct === null) && goodSleepDays.length > 0 && (
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                <span>💡</span>
                <span>Los días que dormiste +7h completaste <strong style={{ color: 'var(--green)' }}>{goodSleepHabitPct}%</strong> de tus hábitos</span>
              </div>
            )}
            {scoreTrend !== null && (
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                <span>{scoreTrend > 5 ? '📈' : scoreTrend < -5 ? '📉' : '➡️'}</span>
                <span>Tu score {scoreTrend > 5 ? <><strong style={{ color: 'var(--green)' }}>mejoró +{scoreTrend}pts</strong> hacia el final de la semana</> : scoreTrend < -5 ? <><strong style={{ color: 'var(--red)' }}>bajó {scoreTrend}pts</strong> hacia el final de la semana</> : <>fue <strong>estable</strong> durante toda la semana</>}</span>
              </div>
            )}
            {bestDay && bestDayScore > 0 && (
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                <span>🏆</span>
                <span>Mejor día: <strong style={{ color: 'var(--accent)' }}>{formatDate(bestDay, { weekday: 'long' })}</strong> con score <strong style={{ color: scoreColor(bestDayScore), fontFamily: 'var(--font-mono)' }}>{bestDayScore}</strong></span>
              </div>
            )}
            {avgMoodHighScore !== null && (
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                <span>🙂</span>
                <span>En tus días de alto rendimiento (score +70) tu estado de ánimo promedio fue <strong style={{ color: 'var(--accent)' }}>{avgMoodHighScore}/5</strong></span>
              </div>
            )}
            {habitsMet === habits.length && habits.length > 0 && (
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                <span>🔥</span>
                <span>¡Cumpliste <strong style={{ color: 'var(--green)' }}>todas tus metas semanales</strong>!</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
