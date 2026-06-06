'use client'
import { useEffect, useRef } from 'react'
import { animate } from 'framer-motion'

interface StatCardProps {
  label: string
  value: string | number
  trend?: string
  trendUp?: boolean
  trendDown?: boolean
  onClick?: () => void
  highlight?: 'red' | 'green' | 'yellow' | 'accent'
  className?: string
}

function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const from = prev.current
    prev.current = value
    const ctrl = animate(from, value, {
      duration: 0.65,
      ease: [0.25, 0.1, 0.25, 1],
      onUpdate(v) {
        el.textContent = Number.isInteger(value)
          ? Math.round(v).toString()
          : v.toFixed(1)
      },
    })
    return ctrl.stop
  }, [value])

  return <span ref={ref}>{value}</span>
}

export default function StatCard({ label, value, trend, trendUp, trendDown, onClick, highlight, className = '' }: StatCardProps) {
  const trendColor = trendUp ? 'var(--green)' : trendDown ? 'var(--red)' : 'var(--text-secondary)'
  const borderStyle = highlight
    ? { borderColor: `var(--${highlight})`, background: `var(--${highlight}-muted)` }
    : {}

  return (
    <div
      className={`card ${className}`}
      onClick={onClick}
      style={{
        padding: '16px 20px',
        cursor: onClick ? 'pointer' : 'default',
        ...borderStyle,
      }}
    >
      <div style={{
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: 8,
      }}>{label}</div>
      <div style={{
        fontSize: 28,
        fontWeight: 700,
        fontFamily: 'var(--font-mono)',
        color: 'var(--text-primary)',
        lineHeight: 1,
      }}>
        {typeof value === 'number' ? <CountUp value={value} /> : value}
      </div>
      {trend && (
        <div style={{ fontSize: 12, color: trendColor, marginTop: 6, fontWeight: 500 }}>
          {trendUp ? '↑' : trendDown ? '↓' : ''} {trend}
        </div>
      )}
    </div>
  )
}
