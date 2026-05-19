'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Btn from '@/components/ui/Btn'
import { Input } from '@/components/ui/Input'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-root)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      <div className="card animate-fade" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Life <span style={{ color: 'var(--accent)' }}>OS</span>
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6 }}>Creá tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Nombre" type="text" placeholder="Tu nombre" value={name} onChange={e => setName(e.target.value)} required />
          <Input label="Email" type="email" placeholder="tucorreo@ejemplo.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          <Input label="Contraseña" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" minLength={6} />
          {error && (
            <div style={{ fontSize: 13, color: 'var(--red)', background: 'var(--red-muted)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--red)' }}>
              {error}
            </div>
          )}
          <Btn type="submit" variant="primary" loading={loading} style={{ width: '100%', marginTop: 4 }}>
            Crear cuenta
          </Btn>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 14, color: 'var(--text-tertiary)' }}>
          ¿Ya tenés cuenta?{' '}
          <a href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Iniciá sesión</a>
        </div>
      </div>
    </div>
  )
}
