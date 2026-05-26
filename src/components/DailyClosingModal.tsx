'use client'
import { useState, useEffect } from 'react'
import Modal from '@/components/ui/Modal'
import Btn from '@/components/ui/Btn'
import { Input, Textarea } from '@/components/ui/Input'
import { useDailyClosing } from '@/hooks/useDailyClosing'
import { today, entryHours } from '@/lib/utils'
import type { SleepEntry } from '@/lib/types'

interface DailyClosingModalProps {
  isOpen: boolean
  onClose: () => void
}

const RATINGS = [
  { value: 1, emoji: '😫', label: 'Pésimo' },
  { value: 2, emoji: '😕', label: 'Mal' },
  { value: 3, emoji: '😐', label: 'Regular' },
  { value: 4, emoji: '🙂', label: 'Bien' },
  { value: 5, emoji: '🤩', label: 'Excelente' },
]

export default function DailyClosingModal({ isOpen, onClose }: DailyClosingModalProps) {
  const [step, setStep] = useState(1)
  const [existingSleep, setExistingSleep] = useState<SleepEntry | null>(null)
  const [sleepTime, setSleepTime] = useState('23:00')
  const [wakeTime, setWakeTime] = useState('07:00')
  const [quality, setQuality] = useState(4)
  const [rating, setRating] = useState<number | null>(null)
  const [journal, setJournal] = useState('')
  const [saving, setSaving] = useState(false)

  const { getClosing, saveClosing, saveSleepForClosing, getSleepEntry } = useDailyClosing()
  const t = today()

  useEffect(() => {
    if (!isOpen) return
    setStep(1)
    setRating(null)
    setJournal('')
    getSleepEntry(t).then(entry => {
      setExistingSleep(entry)
    })
    getClosing(t).then(closing => {
      if (closing) {
        setRating(closing.day_rating)
        setJournal(closing.journal ?? '')
        setStep(2)
      }
    })
  }, [isOpen])

  async function handleFinish() {
    if (!rating) return
    setSaving(true)
    if (!existingSleep && step >= 1) {
      await saveSleepForClosing({ date: t, sleep_time: sleepTime, wake_time: wakeTime, quality })
    }
    await saveClosing(t, rating, journal)
    setSaving(false)
    onClose()
  }

  const titles = ['Registrar sueño', '¿Cómo fue tu día?', 'Journal del día']

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Cerrar el día — Paso ${step}/3: ${titles[step - 1]}`} size="md">
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {existingSleep ? (
            <div style={{
              background: 'var(--green-muted)',
              border: '1px solid var(--green)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>✓</div>
              <div style={{ fontSize: 14, color: 'var(--green)', fontWeight: 500 }}>
                Sueño ya registrado: {entryHours(existingSleep)}h · Calidad {existingSleep.quality}/5
              </div>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Registrá tu sueño de anoche para completar el día.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Input label="Me dormí" type="time" value={sleepTime} onChange={e => setSleepTime(e.target.value)} />
                <Input label="Me desperté" type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Calidad</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1,2,3,4,5].map(q => (
                    <button key={q} onClick={() => setQuality(q)} style={{
                      flex: 1, padding: '8px 0',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${quality === q ? 'var(--accent)' : 'var(--border-default)'}`,
                      background: quality === q ? 'var(--accent-muted)' : 'var(--bg-root)',
                      color: quality === q ? 'var(--accent)' : 'var(--text-secondary)',
                      cursor: 'pointer', fontFamily: 'var(--font-mono)', fontWeight: 600,
                    }}>{q}</button>
                  ))}
                </div>
              </div>
            </>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Btn variant="primary" onClick={() => setStep(2)}>Continuar →</Btn>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>¿Cómo fue tu día?</p>
          <div style={{ display: 'flex', gap: 10 }}>
            {RATINGS.map(r => (
              <button key={r.value} onClick={() => setRating(r.value)} style={{
                flex: 1,
                padding: '16px 8px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${rating === r.value ? 'var(--accent)' : 'var(--border-default)'}`,
                background: rating === r.value ? 'var(--accent-muted)' : 'var(--bg-elevated)',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 24 }}>{r.emoji}</span>
                <span style={{ fontSize: 11, color: rating === r.value ? 'var(--accent)' : 'var(--text-tertiary)', fontWeight: 500 }}>{r.label}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Btn variant="ghost" onClick={() => setStep(1)}>← Atrás</Btn>
            <Btn variant="primary" onClick={() => setStep(3)} disabled={!rating}>Continuar →</Btn>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Textarea
            label="Reflexión del día (opcional)"
            placeholder="¿Qué pasó hoy? ¿Qué aprendiste? ¿Qué podrías mejorar?"
            value={journal}
            onChange={e => setJournal(e.target.value)}
            style={{ minHeight: 160 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Btn variant="ghost" onClick={() => setStep(2)}>← Atrás</Btn>
            <Btn variant="primary" onClick={handleFinish} loading={saving}>
              Cerrar el día ✓
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  )
}
