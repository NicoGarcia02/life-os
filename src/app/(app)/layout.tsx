'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from '@/components/Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

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

      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={pathname}
          className="main-content"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
          style={{
            flex: 1,
            overflowY: 'auto',
            background: 'var(--bg-root)',
          }}
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </div>
  )
}
