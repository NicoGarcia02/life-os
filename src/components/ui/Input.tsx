'use client'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  children: React.ReactNode
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>}
      <input className={`input-base ${className}`} {...props} />
    </div>
  )
}

export function Textarea({ label, className = '', style, ...props }: TextAreaProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>}
      <textarea
        className={`input-base ${className}`}
        style={{ resize: 'vertical', minHeight: 80, ...style }}
        {...props}
      />
    </div>
  )
}

export function SelectInput({ label, children, className = '', ...props }: SelectInputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>}
      <select
        className={`input-base ${className}`}
        style={{ cursor: 'pointer' }}
        {...props}
      >
        {children}
      </select>
    </div>
  )
}
