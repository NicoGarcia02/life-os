'use client'

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
      }}>{value}</div>
      {trend && (
        <div style={{ fontSize: 12, color: trendColor, marginTop: 6, fontWeight: 500 }}>
          {trendUp ? '↑' : trendDown ? '↓' : ''} {trend}
        </div>
      )}
    </div>
  )
}
