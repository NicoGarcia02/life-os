interface SectionHeaderProps {
  title: string
  action?: React.ReactNode
}

export default function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    }}>
      <span style={{
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>{title}</span>
      {action}
    </div>
  )
}
