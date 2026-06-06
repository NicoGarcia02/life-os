export interface Profile {
  id: string
  name: string | null
  avatar_url: string | null
  created_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  emoji: string
  weekly_goal: number
  active: boolean
  created_at: string
}

export interface HabitEntry {
  id: string
  habit_id: string
  user_id: string
  date: string
  completed: boolean
  created_at: string
}

export interface SleepEntry {
  id: string
  user_id: string
  date: string
  sleep_time: string | null
  wake_time: string | null
  quality: number | null
  created_at: string
}

export interface Task {
  id: string
  user_id: string
  title: string
  description: string | null
  priority: 'alta' | 'media' | 'baja'
  due_date: string | null
  completed: boolean
  completed_at: string | null
  created_at: string
}

export interface FinanceCategory {
  id: string
  user_id: string
  name: string
  icon: string
  type: 'ingreso' | 'egreso'
  budget: number | null
  color: string | null
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  category_id: string | null
  description: string
  amount: number
  type: 'ingreso' | 'gasto'
  date: string
  created_at: string
  finance_categories?: FinanceCategory
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string | null
  category: string
  color: string | null
  created_at: string
  updated_at: string
}

export interface CalendarEvent {
  id: string
  user_id: string
  title: string
  date: string
  time: string | null
  duration: number | null
  tag: 'Trabajo' | 'Personal' | 'Salud' | 'Social' | 'Educación'
  created_at: string
}

export interface DailyClosing {
  id: string
  user_id: string
  date: string
  day_rating: number | null
  journal: string | null
  created_at: string
}
