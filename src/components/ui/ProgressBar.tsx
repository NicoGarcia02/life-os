import { progressColor } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  total?: number
  height?: number
  color?: string
  showLabel?: boolean
  className?: string
  style?: React.CSSProperties
}

export default function ProgressBar({ value, total, height = 6, color, showLabel, className = '', style }: ProgressBarProps) {
  const pct = total ? Math.min(100, (value / total) * 100) : Math.min(100, value)
  const c = color ?? progressColor(pct)

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      {showLabel && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>{total ? `${value}/${total}` : `${Math.round(pct)}%`}</span>
          <span style={{ color: c, fontFamily: 'var(--font-mono)' }}>{Math.round(pct)}%</span>
        </div>
      )}
      <div style={{
        height,
        borderRadius: height,
        background: 'var(--bg-active)',
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          borderRadius: height,
          background: c,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  )
}
