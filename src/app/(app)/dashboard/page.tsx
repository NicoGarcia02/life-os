'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import ScoreRing from '@/components/ui/ScoreRing'
import StatCard from '@/components/ui/StatCard'
import ProgressBar from '@/components/ui/ProgressBar'
import SectionHeader from '@/components/ui/SectionHeader'
import Btn from '@/components/ui/Btn'
import Modal from '@/components/ui/Modal'
import { Input, Textarea, SelectInput } from '@/components/ui/Input'
import DailyClosingModal from '@/components/DailyClosingModal'
import { today, formatDate, formatCurrency, calcDailyScore, getContextualMessage, addDays, entryHours } from '@/lib/utils'
import type { Habit, HabitEntry, SleepEntry, Task, Transaction, CalendarEvent, Note } from '@/lib/types'
import { useRouter } from 'next/navigation'

function MiniBarChart({ data, color = 'var(--accent)', height = 40 }: { data: number[], color?: string, height?: number }) {
  if (!data.length) return null
  const max = Math.max(...data, 1)
  const barW = Math.floor(260 / data.length) - 2
  return (
    <svg width={260} height={height} style={{ overflow: 'visible' }}>
      {data.map((v, i) => {
        const bh = Math.max(2, (v / max) * height)
        return (
          <rect key={i} x={i * (barW + 2)} y={height - bh} width={barW} height={bh}
            rx={2} fill={color} opacity={0.4 + (i / data.length) * 0.6} />
        )
      })}
    </svg>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [habits, setHabits] = useState<Habit[]>([])
  const [entries, setEntries] = useState<HabitEntry[]>([])
  const [sleepEntry, setSleepEntry] = useState<SleepEntry | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [quickNote, setQuickNote] = useState('')
  const [quickNoteId, setQuickNoteId] = useState<string | null>(null)
  const [scoreHistory, setScoreHistory] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [closingOpen, setClosingOpen] = useState(false)

  // Quick action modals
  const [txModal, setTxModal] = useState(false)
  const [taskModal, setTaskModal] = useState(false)
  const [noteModal, setNoteModal] = useState(false)
  const [txForm, setTxForm] = useState({ description: '', amount: '', type: 'gasto' as 'gasto' | 'ingreso', category_id: '' })
  const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'media' as Task['priority'], due_date: '' })
  const [noteForm, setNoteForm] = useState({ title: '', content: '', category: 'General' })
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

  const t = today()

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [habitsRes, entriesRes, sleepRes, tasksRes, txRes, eventsRes, noteRes, catsRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', user.id).eq('active', true),
      supabase.from('habit_entries').select('*').eq('user_id', user.id).gte('date', addDays(t, -14)).lte('date', t),
      supabase.from('sleep_entries').select('*').eq('user_id', user.id).eq('date', addDays(t, -1)).maybeSingle(),
      supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('transactions').select('*').eq('user_id', user.id).gte('date', `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`),
      supabase.from('events').select('*').eq('user_id', user.id).eq('date', t).order('time'),
      supabase.from('notes').select('*').eq('user_id', user.id).eq('category', '__quick__').maybeSingle(),
      supabase.from('finance_categories').select('id, name').eq('user_id', user.id),
    ])

    setHabits(habitsRes.data ?? [])
    setEntries(entriesRes.data ?? [])
    setSleepEntry(sleepRes.data ?? null)
    setTasks(tasksRes.data ?? [])
    setTransactions(txRes.data ?? [])
    setEvents(eventsRes.data ?? [])
    setQuickNote(noteRes.data?.content ?? '')
    setQuickNoteId(noteRes.data?.id ?? null)
    setCategories(catsRes.data ?? [])

    // Score history (last 14 days)
    const activeIds = new Set((habitsRes.data ?? []).map(h => h.id))
    const habitsTotal = (habitsRes.data ?? []).length
    const history: number[] = []
    for (let i = 13; i >= 0; i--) {
      const day = addDays(t, -i)
      const dayEntries = (entriesRes.data ?? []).filter(e => e.date === day && e.completed && activeIds.has(e.habit_id))
      const score = calcDailyScore({
        habitsCompleted: dayEntries.length,
        habitsTotal,
        sleepHours: i === 1 && sleepRes.data ? entryHours(sleepRes.data) : null,
        tasksCompleted: 0,
        tasksTotal: 0,
      })
      history.push(score)
    }
    setScoreHistory(history)
    setLoading(false)
  }, [t])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function toggleHabit(habitId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const existing = entries.find(e => e.habit_id === habitId && e.date === t && e.completed)
    if (existing) {
      await supabase.from('habit_entries').delete().eq('habit_id', habitId).eq('date', t)
    } else {
      await supabase.from('habit_entries').upsert(
        { habit_id: habitId, user_id: user.id, date: t, completed: true },
        { onConflict: 'habit_id,date' }
      )
    }
    const { data } = await supabase.from('habit_entries').select('*').eq('user_id', user.id).eq('date', t)
    setEntries(prev => [...prev.filter(e => e.date !== t), ...(data ?? [])])
  }

  async function saveQuickNote() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (quickNoteId) {
      await supabase.from('notes').update({ content: quickNote, updated_at: new Date().toISOString() }).eq('id', quickNoteId)
    } else if (quickNote.trim()) {
      const { data } = await supabase.from('notes').insert({ user_id: user.id, title: 'Nota rápida', content: quickNote, category: '__quick__' }).select().single()
      if (data) setQuickNoteId(data.id)
    }
  }

  async function submitTx(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('transactions').insert({
      user_id: user.id,
      description: txForm.description,
      amount: parseFloat(txForm.amount),
      type: txForm.type,
      date: t,
      category_id: txForm.category_id || null,
    })
    setTxModal(false)
    setTxForm({ description: '', amount: '', type: 'gasto', category_id: '' })
    fetchAll()
  }

  async function submitTask(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('tasks').insert({ user_id: user.id, ...taskForm, due_date: taskForm.due_date || null })
    setTaskModal(false)
    setTaskForm({ title: '', description: '', priority: 'media', due_date: '' })
    fetchAll()
  }

  async function submitNote(e: React.FormEvent) {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('notes').insert({ user_id: user.id, ...noteForm })
    setNoteModal(false)
    setNoteForm({ title: '', content: '', category: 'General' })
  }

  // Computed values
  const activeHabitIds = new Set(habits.map(h => h.id))
  const todayEntries = entries.filter(e => e.date === t && e.completed && activeHabitIds.has(e.habit_id))
  const habitsCompleted = todayEntries.length
  const habitsTotal = habits.length
  const habitPct = habitsTotal > 0 ? (habitsCompleted / habitsTotal) * 100 : 0

  const todayTasks = tasks.filter(task => task.due_date === t || (!task.due_date && task.created_at?.startsWith(t)))
  const completedTodayTasks = todayTasks.filter(t => t.completed).length
  const overdueTasks = tasks.filter(task => !task.completed && task.due_date && task.due_date < t)
  const overduePriorityCount = overdueTasks.filter(t => t.priority === 'alta').length

  const monthBalance = transactions.reduce((s, tx) => tx.type === 'ingreso' ? s + tx.amount : s - tx.amount, 0)

  const sleepHours = sleepEntry ? entryHours(sleepEntry) : null

  const score = calcDailyScore({
    habitsCompleted, habitsTotal,
    sleepHours,
    tasksCompleted: completedTodayTasks,
    tasksTotal: todayTasks.length,
  })

  const message = getContextualMessage(overduePriorityCount, sleepHours, habitPct)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400 }}>
      <div style={{ color: 'var(--text-tertiary)' }}>Cargando...</div>
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }} className="animate-fade">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Dashboard</h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>
            {formatDate(t, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <Btn variant="primary" onClick={() => setClosingOpen(true)}>Cerrar el día</Btn>
      </div>

      {/* Score + mensaje */}
      <div className="card" style={{ padding: 28, marginBottom: 24, display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
        <ScoreRing score={score} size={120} label="hoy" />
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 16, fontWeight: 500, marginBottom: 6 }}>{message}</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 16 }}>Puntuación de los últimos 14 días</div>
          <MiniBarChart data={scoreHistory} />
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <Btn variant="secondary" onClick={() => setTxModal(true)} style={{ flex: 1 }}>+ Registrar gasto</Btn>
        <Btn variant="secondary" onClick={() => setTaskModal(true)} style={{ flex: 1 }}>+ Agregar tarea</Btn>
        <Btn variant="secondary" onClick={() => setNoteModal(true)} style={{ flex: 1 }}>+ Nueva nota</Btn>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <StatCard
          label="Hábitos hoy"
          value={`${habitsCompleted}/${habitsTotal}`}
          trend={habitPct > 0 ? `${Math.round(habitPct)}% completado` : 'Sin comenzar'}
          trendUp={habitPct >= 80}
          onClick={() => router.push('/habits')}
        />
        <StatCard
          label="Sueño anoche"
          value={sleepHours ? `${sleepHours}h` : '—'}
          trend={sleepEntry ? `Calidad ${sleepEntry.quality}/5` : 'Sin registrar'}
          trendUp={!!(sleepHours && sleepHours >= 7)}
          trendDown={!!(sleepHours && sleepHours < 6)}
          onClick={() => router.push('/sleep')}
        />
        <StatCard
          label="Tareas hoy"
          value={`${completedTodayTasks}/${todayTasks.length}`}
          trend={overdueTasks.length > 0 ? `${overdueTasks.length} atrasada${overdueTasks.length > 1 ? 's' : ''}` : 'Al día'}
          trendDown={overdueTasks.length > 0}
          trendUp={todayTasks.length > 0 && completedTodayTasks === todayTasks.length}
          highlight={overdueTasks.length > 0 ? 'red' : undefined}
          onClick={() => router.push('/tasks')}
        />
        <StatCard
          label="Balance del mes"
          value={formatCurrency(monthBalance)}
          trend={monthBalance >= 0 ? 'Positivo' : 'Negativo'}
          trendUp={monthBalance > 0}
          trendDown={monthBalance < 0}
          onClick={() => router.push('/finances')}
        />
      </div>

      {/* Grilla 2x2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Hábitos */}
        <div className="card" style={{ padding: 20 }}>
          <SectionHeader title="Hábitos de hoy" action={
            <a href="/habits" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Ver todos →</a>
          } />
          <ProgressBar value={habitsCompleted} total={habitsTotal || 1} showLabel height={6} />
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {habits.length === 0 && <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No tenés hábitos todavía</div>}
            {habits.map((habit, i) => {
              const done = todayEntries.some(e => e.habit_id === habit.id)
              return (
                <div key={habit.id}
                  className={`animate-fade stagger-${Math.min(i + 1, 7)}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', cursor: 'pointer' }}
                  onClick={() => toggleHabit(habit.id)}
                >
                  <div className={`habit-check ${done ? 'checked' : ''}`}>
                    {done && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 14, textDecoration: done ? 'line-through' : 'none', color: done ? 'var(--text-tertiary)' : 'var(--text-primary)' }}>
                    {habit.emoji} {habit.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sueño */}
        <div className="card" style={{ padding: 20 }}>
          <SectionHeader title="Sueño" action={
            <a href="/sleep" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Registrar →</a>
          } />
          {sleepEntry ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 36, fontWeight: 700, fontFamily: 'var(--font-mono)', color: sleepHours && sleepHours >= 7 ? 'var(--green)' : sleepHours && sleepHours >= 6 ? 'var(--yellow)' : 'var(--red)' }}>
                  {sleepHours}h
                </span>
                <span style={{ fontSize: 14, color: 'var(--text-tertiary)' }}>anoche</span>
              </div>
              {sleepEntry.sleep_time && sleepEntry.wake_time && (
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                  {sleepEntry.sleep_time.slice(0,5)} → {sleepEntry.wake_time.slice(0,5)}
                </div>
              )}
              <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                {[1,2,3,4,5].map(n => (
                  <div key={n} style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: n <= (sleepEntry.quality ?? 0) ? 'var(--accent)' : 'var(--bg-active)',
                  }} />
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: 'var(--text-tertiary)', fontSize: 13 }}>Sin registro de sueño para ayer</div>
          )}
        </div>

        {/* Nota rápida */}
        <div className="card" style={{ padding: 20 }}>
          <SectionHeader title="Nota rápida" />
          <textarea
            className="input-base"
            placeholder="Escribí algo rápido..."
            value={quickNote}
            onChange={e => setQuickNote(e.target.value)}
            onBlur={saveQuickNote}
            style={{ minHeight: 100, resize: 'none', marginTop: 4 }}
          />
        </div>

        {/* Próximos eventos */}
        <div className="card" style={{ padding: 20 }}>
          <SectionHeader title="Hoy" action={
            <a href="/calendar" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>Calendario →</a>
          } />
          {events.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Sin eventos para hoy</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {events.map((ev, i) => (
                <div key={ev.id} className={`animate-fade stagger-${Math.min(i + 1, 7)}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 3, height: 36, borderRadius: 2, background: `var(--${ev.tag === 'Trabajo' ? 'accent' : ev.tag === 'Salud' ? 'red' : ev.tag === 'Social' ? 'yellow' : ev.tag === 'Educación' ? 'purple' : 'green'})`, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{ev.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                      {ev.time ? ev.time.slice(0, 5) : 'Todo el día'} · {ev.tag}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <DailyClosingModal isOpen={closingOpen} onClose={() => { setClosingOpen(false); fetchAll() }} />

      <Modal isOpen={txModal} onClose={() => setTxModal(false)} title="Registrar gasto" size="sm">
        <form onSubmit={submitTx} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Descripción" value={txForm.description} onChange={e => setTxForm(p => ({ ...p, description: e.target.value }))} required placeholder="Ej: Almuerzo" />
          <Input label="Monto" type="number" value={txForm.amount} onChange={e => setTxForm(p => ({ ...p, amount: e.target.value }))} required min="0" step="0.01" placeholder="0" />
          <SelectInput label="Tipo" value={txForm.type} onChange={e => setTxForm(p => ({ ...p, type: e.target.value as 'gasto' | 'ingreso' }))}>
            <option value="gasto">Gasto</option>
            <option value="ingreso">Ingreso</option>
          </SelectInput>
          {categories.length > 0 && (
            <SelectInput label="Categoría" value={txForm.category_id} onChange={e => setTxForm(p => ({ ...p, category_id: e.target.value }))}>
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </SelectInput>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Btn variant="ghost" type="button" onClick={() => setTxModal(false)}>Cancelar</Btn>
            <Btn variant="primary" type="submit">Guardar</Btn>
          </div>
        </form>
      </Modal>

      <Modal isOpen={taskModal} onClose={() => setTaskModal(false)} title="Nueva tarea" size="sm">
        <form onSubmit={submitTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Título" value={taskForm.title} onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} required placeholder="¿Qué hay que hacer?" />
          <SelectInput label="Prioridad" value={taskForm.priority} onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value as Task['priority'] }))}>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </SelectInput>
          <Input label="Fecha límite" type="date" value={taskForm.due_date} onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Btn variant="ghost" type="button" onClick={() => setTaskModal(false)}>Cancelar</Btn>
            <Btn variant="primary" type="submit">Guardar</Btn>
          </div>
        </form>
      </Modal>

      <Modal isOpen={noteModal} onClose={() => setNoteModal(false)} title="Nueva nota" size="sm">
        <form onSubmit={submitNote} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Título" value={noteForm.title} onChange={e => setNoteForm(p => ({ ...p, title: e.target.value }))} required placeholder="Título de la nota" />
          <Textarea label="Contenido" value={noteForm.content} onChange={e => setNoteForm(p => ({ ...p, content: e.target.value }))} placeholder="Escribí tu nota..." style={{ minHeight: 100 }} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Btn variant="ghost" type="button" onClick={() => setNoteModal(false)}>Cancelar</Btn>
            <Btn variant="primary" type="submit">Guardar</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
