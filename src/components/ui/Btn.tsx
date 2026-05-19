'use client'

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  loading?: boolean
  children: React.ReactNode
}

export default function Btn({ variant = 'secondary', size = 'md', loading, children, style, ...props }: BtnProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'inherit',
    fontWeight: 500,
    cursor: props.disabled || loading ? 'not-allowed' : 'pointer',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    transition: 'opacity 0.15s, background 0.15s',
    whiteSpace: 'nowrap',
    opacity: props.disabled || loading ? 0.5 : 1,
    fontSize: size === 'sm' ? 13 : 14,
    padding: size === 'sm' ? '6px 12px' : '10px 16px',
  }

  const variants: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--accent)', color: '#0a0a0a' },
    secondary: { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-default)' },
    danger: { background: 'var(--red-muted)', color: 'var(--red)', border: '1px solid var(--red)' },
    ghost: { background: 'transparent', color: 'var(--text-secondary)' },
  }

  return (
    <button {...props} style={{ ...base, ...variants[variant], ...style }}>
      {loading ? <span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⟳</span> : children}
    </button>
  )
}
