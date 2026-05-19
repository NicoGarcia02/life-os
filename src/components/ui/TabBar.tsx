'use client'

interface Tab {
  id: string
  label: string
}

interface TabBarProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
}

export default function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div style={{
      display: 'flex',
      gap: 4,
      background: 'var(--bg-surface)',
      padding: 4,
      borderRadius: 'var(--radius-md)',
      width: 'fit-content',
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding: '7px 16px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
            background: active === tab.id ? 'var(--bg-elevated)' : 'transparent',
            color: active === tab.id ? 'var(--text-primary)' : 'var(--text-tertiary)',
            boxShadow: active === tab.id ? 'var(--shadow-card)' : 'none',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
