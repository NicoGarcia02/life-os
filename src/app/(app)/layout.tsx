'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Mobile header */}
      <div className="mobile-header">
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: 22,
            cursor: 'pointer',
            padding: '4px 8px',
            lineHeight: 1,
            fontFamily: 'inherit',
          }}
        >☰</button>
        <span style={{
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
        }}>
          Life <span style={{ color: 'var(--accent)' }}>OS</span>
        </span>
        <div style={{ width: 40 }} />
      </div>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="main-content" style={{
        flex: 1,
        overflowY: 'auto',
        background: 'var(--bg-root)',
      }}>
        {children}
      </main>
    </div>
  )
}
