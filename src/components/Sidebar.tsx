'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const NAV = [
  { href: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { href: '/habits', icon: '✓', label: 'Hábitos' },
  { href: '/sleep', icon: '◑', label: 'Sueño' },
  { href: '/tasks', icon: '☑', label: 'Tareas' },
  { href: '/finances', icon: '$', label: 'Finanzas' },
  { href: '/notes', icon: '✎', label: 'Notas' },
  { href: '/journal', icon: '◈', label: 'Diario' },
  { href: '/calendar', icon: '▦', label: 'Calendario' },
  { href: '/weekly', icon: '▤', label: 'Resumen' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Life <span style={{ color: 'var(--accent)' }}>OS</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Sistema personal</div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
        {NAV.map(item => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 2,
                background: active ? 'var(--accent-muted)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                fontWeight: active ? 600 : 400,
                fontSize: 14,
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 10px',
            width: '100%',
            borderRadius: 'var(--radius-sm)',
            background: 'none',
            border: 'none',
            color: 'var(--text-tertiary)',
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'color 0.15s',
          }}
        >
          <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>⎋</span>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
