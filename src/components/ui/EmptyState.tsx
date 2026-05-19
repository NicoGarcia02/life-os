import Btn from './Btn'

interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: '48px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 40 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</div>
      {description && <div style={{ fontSize: 14, color: 'var(--text-tertiary)', maxWidth: 280 }}>{description}</div>}
      {action && <Btn variant="primary" onClick={action.onClick} style={{ marginTop: 4 }}>{action.label}</Btn>}
    </div>
  )
}
