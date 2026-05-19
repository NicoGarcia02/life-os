'use client'
import { formatDate, today, addDays } from '@/lib/utils'

interface DateNavProps {
  date: string
  onChange: (date: string) => void
  maxDate?: string
}

export default function DateNav({ date, onChange, maxDate }: DateNavProps) {
  const isToday = date === today()
  const atMax = maxDate ? date >= maxDate : date >= today()

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={() => onChange(addDays(date, -1))}
        style={{
          width: 32, height: 32,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >‹</button>
      <span style={{
        fontSize: 14,
        fontWeight: 500,
        color: 'var(--text-primary)',
        minWidth: 160,
        textAlign: 'center',
      }}>
        {isToday ? 'Hoy' : formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}
      </span>
      <button
        onClick={() => { if (!atMax) onChange(addDays(date, 1)) }}
        disabled={atMax}
        style={{
          width: 32, height: 32,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          color: atMax ? 'var(--text-tertiary)' : 'var(--text-secondary)',
          cursor: atMax ? 'not-allowed' : 'pointer',
          fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: atMax ? 0.4 : 1,
        }}
      >›</button>
      {!isToday && (
        <button
          onClick={() => onChange(today())}
          style={{
            padding: '4px 10px',
            background: 'var(--accent-muted)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--accent)',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
          }}
        >Hoy</button>
      )}
    </div>
  )
}
