export function today(): string {
  return new Date().toISOString().split('T')[0]
}

export function formatDate(dateStr: string, opts?: Intl.DateTimeFormatOptions): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('es-AR', opts ?? { weekday: 'short', day: 'numeric', month: 'short' })
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(amount)
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  return `${h}:${m}`
}

export function calcHoursSlept(bedtime: string, wakeTime: string): number {
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  let mins = (wh * 60 + wm) - (bh * 60 + bm)
  if (mins < 0) mins += 24 * 60
  return Math.round((mins / 60) * 10) / 10
}

export function entryHours(entry: { sleep_time: string | null; wake_time: string | null }): number {
  if (!entry.sleep_time || !entry.wake_time) return 0
  return calcHoursSlept(entry.sleep_time, entry.wake_time)
}

export function getWeekRange(offsetWeeks = 0): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff + offsetWeeks * 7)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    start: monday.toISOString().split('T')[0],
    end: sunday.toISOString().split('T')[0],
  }
}

export function getDaysInRange(start: string, end: string): string[] {
  const days: string[] = []
  const current = new Date(start + 'T00:00:00')
  const endDate = new Date(end + 'T00:00:00')
  while (current <= endDate) {
    days.push(current.toISOString().split('T')[0])
    current.setDate(current.getDate() + 1)
  }
  return days
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

export function scoreColor(score: number): string {
  if (score >= 80) return 'var(--green)'
  if (score >= 60) return 'var(--accent)'
  if (score >= 40) return 'var(--yellow)'
  return 'var(--red)'
}

export function progressColor(pct: number): string {
  if (pct >= 80) return 'var(--green)'
  if (pct >= 50) return 'var(--accent)'
  if (pct >= 30) return 'var(--yellow)'
  return 'var(--red)'
}

export function calcDailyScore({
  habitsCompleted, habitsTotal,
  sleepHours,
  tasksCompleted, tasksTotal,
}: {
  habitsCompleted: number
  habitsTotal: number
  sleepHours: number | null
  tasksCompleted: number
  tasksTotal: number
}): number {
  const habitScore = habitsTotal > 0 ? (habitsCompleted / habitsTotal) * 60 : 0
  let sleepScore = 0
  if (sleepHours !== null) {
    if (sleepHours >= 8) sleepScore = 25
    else if (sleepHours >= 7) sleepScore = 20
    else if (sleepHours >= 6) sleepScore = 15
    else if (sleepHours >= 5) sleepScore = 10
    else sleepScore = 5
  }
  const taskScore = tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 15 : 0
  return Math.min(100, Math.round(habitScore + sleepScore + taskScore))
}

export function getContextualMessage(
  overduePriorityCount: number,
  sleepHours: number | null,
  habitPct: number,
): string {
  if (overduePriorityCount > 0)
    return `Tenés ${overduePriorityCount} tarea${overduePriorityCount > 1 ? 's' : ''} atrasada${overduePriorityCount > 1 ? 's' : ''} urgente${overduePriorityCount > 1 ? 's' : ''}`
  if (sleepHours !== null && sleepHours < 6)
    return 'Dormiste poco anoche — priorizá descanso'
  if (habitPct === 100 && habitPct > 0)
    return 'Día perfecto hasta ahora 🔥'
  if (habitPct > 70)
    return 'Buen ritmo, seguí así'
  return 'Arrancá el día completando tus hábitos'
}

export const TAG_COLORS: Record<string, string> = {
  Trabajo: '#7c9aff',
  Personal: '#4ade80',
  Salud: '#f87171',
  Social: '#fbbf24',
  Educación: '#c084fc',
}

export const NOTE_CATEGORIES = ['General', 'Ideas', 'Trabajo', 'Personal', 'Salud', 'Finanzas']

export const EMOJI_OPTIONS = ['💰','🍕','🎮','📚','💪','🧘','🚗','✈️','🏠','👕','🛒','🍺','☕','🎵','💊','🐕','🎁','📱','💻','⚡','🎯','🔑','🌿','🍎','🏃']

export const HABIT_EMOJI_OPTIONS = ['✅','💪','🏃','🧘','📚','💤','🥗','💧','🎯','🔥','⚡','🌱','🎵','✍️','🧹','💻','📝','🌅','🚴','🏋️','🧠','❤️','🤸','🌿','😊','🦷','🚿','🍎','🥊','🏊','🧴','🧩','🎨','📖','🗓️']
