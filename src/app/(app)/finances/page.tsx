'use client'
import { useState } from 'react'

const CHART_COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4','#84cc16']

function pt(cx: number, cy: number, r: number, deg: number) {
  const rad = deg * Math.PI / 180
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) }
}
function slicePath(cx: number, cy: number, R: number, r: number, a1: number, a2: number) {
  const p1 = pt(cx, cy, R, a1), p2 = pt(cx, cy, R, a2)
  const p3 = pt(cx, cy, r, a2), p4 = pt(cx, cy, r, a1)
  const large = a2 - a1 > 180 ? 1 : 0
  return `M${p1.x} ${p1.y} A${R} ${R} 0 ${large} 1 ${p2.x} ${p2.y} L${p3.x} ${p3.y} A${r} ${r} 0 ${large} 0 ${p4.x} ${p4.y}Z`
}
import TabBar from '@/components/ui/TabBar'
import StatCard from '@/components/ui/StatCard'
import ProgressBar from '@/components/ui/ProgressBar'
import SectionHeader from '@/components/ui/SectionHeader'
import Modal from '@/components/ui/Modal'
import Btn from '@/components/ui/Btn'
import { Input, SelectInput } from '@/components/ui/Input'
import EmptyState from '@/components/ui/EmptyState'
import { useFinances } from '@/hooks/useFinances'
import { today, formatCurrency, formatDate, EMOJI_OPTIONS } from '@/lib/utils'
import type { Transaction, FinanceCategory } from '@/lib/types'

export default function FinancesPage() {
  const { categories, transactions, monthTx, monthIncome, monthExpense, monthBalance, loading, addTransaction, deleteTransaction, updateTransaction, addCategory, updateCategory, refetch } = useFinances()
  const [tab, setTab] = useState('resumen')
  const [txModal, setTxModal] = useState(false)
  const [catModal, setCatModal] = useState(false)
  const [editCat, setEditCat] = useState<FinanceCategory | null>(null)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [txForm, setTxForm] = useState({ description: '', amount: '', type: 'gasto' as 'gasto' | 'ingreso', category_id: '', date: today() })
  const [catForm, setCatForm] = useState({ name: '', icon: '💰', type: 'egreso' as 'egreso' | 'ingreso', budget: '' })
  const [saving, setSaving] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr)

  function prevMonth() {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    setExpandedCat(null)
  }
  function nextMonth() {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m, 1)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    setExpandedCat(null)
  }

  function openNewTx() {
    setEditTx(null)
    setTxForm({ description: '', amount: '', type: 'gasto', category_id: '', date: today() })
    setTxModal(true)
  }

  function openEditTx(tx: Transaction) {
    setEditTx(tx)
    setTxForm({ description: tx.description, amount: tx.amount.toString(), type: tx.type, category_id: tx.category_id ?? '', date: tx.date })
    setTxModal(true)
  }

  function openNewCat() {
    setEditCat(null)
    setCatForm({ name: '', icon: '💰', type: 'egreso', budget: '' })
    setCatModal(true)
  }

  function openEditCat(cat: FinanceCategory) {
    setEditCat(cat)
    setCatForm({ name: cat.name, icon: cat.icon, type: cat.type, budget: cat.budget?.toString() ?? '' })
    setCatModal(true)
  }

  async function saveTx(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setTxError(null)
    const txData = { ...txForm, amount: parseFloat(txForm.amount), category_id: txForm.category_id || null }
    const err = editTx ? await updateTransaction(editTx.id, txData) : await addTransaction(txData)
    setSaving(false)
    if (err) { setTxError(err); return }
    setTxModal(false)
    setEditTx(null)
    setTxForm({ description: '', amount: '', type: 'gasto', category_id: '', date: today() })
  }

  async function saveCat(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const budget = catForm.budget ? parseFloat(catForm.budget) : null
    if (editCat) {
      await updateCategory(editCat.id, { name: catForm.name, icon: catForm.icon, type: catForm.type, budget })
    } else {
      await addCategory({ name: catForm.name, icon: catForm.icon, type: catForm.type, budget })
    }
    setCatModal(false)
    setSaving(false)
  }

  // Filtered by selected month
  const isCurrentMonth = selectedMonth === currentMonthStr
  const monthLabel = new Date(selectedMonth + '-15').toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const selTx = transactions.filter(t => t.date?.startsWith(selectedMonth))
  const selIncome = selTx.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0)
  const selExpense = selTx.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0)
  const selBalance = selIncome - selExpense

  // Category spending
  const catSpending: Record<string, number> = {}
  selTx.filter(t => t.type === 'gasto').forEach(t => {
    if (t.category_id) catSpending[t.category_id] = (catSpending[t.category_id] ?? 0) + t.amount
  })

  const catIncome: Record<string, number> = {}
  selTx.filter(t => t.type === 'ingreso').forEach(t => {
    if (t.category_id) catIncome[t.category_id] = (catIncome[t.category_id] ?? 0) + t.amount
  })

  if (loading) return <div style={{ color: 'var(--text-tertiary)', padding: 40 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }} className="animate-fade">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em' }}>Finanzas</h1>
          <p style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 4 }}>Control de ingresos y gastos</p>
        </div>
        <Btn variant="primary" onClick={openNewTx}>+ Agregar</Btn>
      </div>

      <TabBar
        tabs={[{ id: 'resumen', label: 'Resumen' }, { id: 'movimientos', label: 'Movimientos' }, { id: 'categorias', label: 'Categorías' }]}
        active={tab}
        onChange={setTab}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 20, marginBottom: 4 }}>
        <Btn variant="ghost" size="sm" onClick={prevMonth}>‹</Btn>
        <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize', minWidth: 160, textAlign: 'center' }}>{monthLabel}</span>
        <Btn variant="ghost" size="sm" onClick={nextMonth} style={{ opacity: isCurrentMonth ? 0.3 : 1, pointerEvents: isCurrentMonth ? 'none' : 'auto' }}>›</Btn>
      </div>

      <div style={{ marginTop: 16 }}>
        {tab === 'resumen' && (
          <div>
            <div className="grid-3" style={{ gap: 12, marginBottom: 20 }}>
              <StatCard label="Balance del mes" value={formatCurrency(selBalance)} trendUp={selBalance > 0} trendDown={selBalance < 0} />
              <StatCard label="Ingresos" value={formatCurrency(selIncome)} trendUp={selIncome > 0} />
              <StatCard label="Gastos" value={formatCurrency(selExpense)} trendDown={selExpense > 0} />
            </div>

            {/* Gastos por categoría */}
            {categories.filter(c => c.type === 'egreso').length > 0 && (
              <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                <SectionHeader title="Gastos por categoría" />
                {(() => {
                  const data = categories
                    .filter(c => c.type === 'egreso' && (catSpending[c.id] ?? 0) > 0)
                    .map((c, i) => ({ cat: c, value: catSpending[c.id] ?? 0, color: CHART_COLORS[i % CHART_COLORS.length] }))
                  const total = data.reduce((s, d) => s + d.value, 0)
                  if (data.length === 0) return null
                  let angle = 0
                  const slices = data.map(d => {
                    const span = d.value / total * (data.length === 1 ? 359.99 : 360)
                    const s = { ...d, a1: angle, a2: angle + span }
                    angle += span
                    return s
                  })
                  return (
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
                      <svg width={150} height={150} viewBox="0 0 160 160" style={{ flexShrink: 0 }}>
                        {slices.map((s, i) => <path key={i} d={slicePath(80, 80, 72, 46, s.a1, s.a2)} fill={s.color} />)}
                      </svg>
                      <div style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {slices.map((s, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                            <span style={{ fontSize: 13, flex: 1 }}>{s.cat.icon} {s.cat.name}</span>
                            <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{Math.round(s.value / total * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {categories.filter(c => c.type === 'egreso').map(cat => {
                    const spent = catSpending[cat.id] ?? 0
                    const isExpanded = expandedCat === cat.id
                    const catTxs = selTx.filter(t => t.type === 'gasto' && t.category_id === cat.id)
                    return (
                      <div key={cat.id}>
                        <div
                          onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                          style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, cursor: 'pointer', userSelect: 'none' }}
                        >
                          <span style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{cat.icon}</span>{cat.name}
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{isExpanded ? '▲' : '▼'}</span>
                          </span>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{formatCurrency(spent)}</span>
                            {cat.budget && <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 4 }}>/ {formatCurrency(cat.budget)}</span>}
                          </div>
                        </div>
                        {cat.budget && <ProgressBar value={spent} total={cat.budget} height={6} />}
                        {isExpanded && (
                          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {catTxs.length === 0 ? (
                              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', paddingLeft: 8 }}>Sin movimientos este mes</div>
                            ) : catTxs.map(tx => (
                              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: 'var(--bg-root)', borderRadius: 'var(--radius-sm)' }}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 500 }}>{tx.description}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{formatDate(tx.date)}</div>
                                </div>
                                <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>-{formatCurrency(tx.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Ingresos por categoría */}
            {categories.filter(c => c.type === 'ingreso').length > 0 && (
              <div className="card" style={{ padding: 20 }}>
                <SectionHeader title="Ingresos por categoría" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {categories.filter(c => c.type === 'ingreso').map(cat => {
                    const received = catIncome[cat.id] ?? 0
                    const isExpanded = expandedCat === cat.id
                    const catTxs = monthTx.filter(t => t.type === 'ingreso' && t.category_id === cat.id)
                    return (
                      <div key={cat.id}>
                        <div
                          onClick={() => setExpandedCat(isExpanded ? null : cat.id)}
                          style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, cursor: 'pointer', userSelect: 'none' }}
                        >
                          <span style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{cat.icon}</span>{cat.name}
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{isExpanded ? '▲' : '▼'}</span>
                          </span>
                          <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green)' }}>+{formatCurrency(received)}</span>
                        </div>
                        {isExpanded && (
                          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {catTxs.length === 0 ? (
                              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', paddingLeft: 8 }}>Sin movimientos este mes</div>
                            ) : catTxs.map(tx => (
                              <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: 'var(--bg-root)', borderRadius: 'var(--radius-sm)' }}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 500 }}>{tx.description}</div>
                                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{formatDate(tx.date)}</div>
                                </div>
                                <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--green)' }}>+{formatCurrency(tx.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Tendencia mensual */}
            {(() => {
              const months = Array.from({ length: 6 }, (_, i) => {
                const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
                const str = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
                const label = d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')
                const txs = transactions.filter(t => t.date?.startsWith(str))
                return {
                  label,
                  income: txs.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0),
                  expense: txs.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0),
                }
              })
              const maxVal = Math.max(...months.flatMap(m => [m.income, m.expense]), 1)
              const CH = 90, BW = 16, IG = 4, GW = BW * 2 + IG, GG = 14, PAD = 2
              return (
                <div className="card" style={{ padding: 20, marginTop: 20 }}>
                  <SectionHeader title="Tendencia mensual" />
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>
                    <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--green)', marginRight: 5 }} />Ingresos</span>
                    <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--red)', marginRight: 5 }} />Gastos</span>
                  </div>
                  <svg viewBox={`0 0 300 125`} width="100%" style={{ display: 'block' }}>
                    {months.map((m, i) => {
                      const gx = PAD + i * (GW + GG)
                      const ih = Math.max(2, (m.income / maxVal) * CH)
                      const eh = Math.max(2, (m.expense / maxVal) * CH)
                      return (
                        <g key={i}>
                          <rect x={gx} y={CH - ih} width={BW} height={ih} fill="var(--green)" rx={2} opacity={0.85} />
                          <rect x={gx + BW + IG} y={CH - eh} width={BW} height={eh} fill="var(--red)" rx={2} opacity={0.85} />
                          <text x={gx + GW / 2} y={CH + 16} textAnchor="middle" fontSize={10} fill="var(--text-tertiary)" style={{ textTransform: 'capitalize' }}>{m.label}</text>
                        </g>
                      )
                    })}
                  </svg>
                </div>
              )
            })()}
          </div>
        )}

        {tab === 'movimientos' && (
          <div>
            {selTx.length === 0 ? (
              <EmptyState icon="💰" title="Sin movimientos" description="No hay movimientos en este mes." action={{ label: '+ Agregar', onClick: openNewTx }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selTx.map((tx, i) => {
                  const cat = tx.finance_categories
                  return (
                    <div key={tx.id} className={`card animate-fade stagger-${Math.min(i + 1, 7)}`}
                      style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                        background: tx.type === 'ingreso' ? 'var(--green-muted)' : 'var(--red-muted)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, flexShrink: 0,
                      }}>
                        {cat?.icon ?? (tx.type === 'ingreso' ? '↑' : '↓')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                          {cat?.name ?? 'Sin categoría'} · {formatDate(tx.date)}
                        </div>
                      </div>
                      <div style={{
                        fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-mono)',
                        color: tx.type === 'ingreso' ? 'var(--green)' : 'var(--text-primary)',
                      }}>
                        {tx.type === 'ingreso' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </div>
                      <Btn variant="ghost" size="sm" onClick={() => openEditTx(tx)}>✎</Btn>
                      <Btn variant="danger" size="sm" onClick={() => deleteTransaction(tx.id)}>✕</Btn>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'categorias' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {categories.map((cat, i) => {
              const spent = catSpending[cat.id] ?? 0
              return (
                <div key={cat.id} className={`card animate-fade stagger-${Math.min(i + 1, 7)}`} style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>{cat.icon}</span>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{cat.name}</span>
                    </div>
                    <Btn variant="ghost" size="sm" onClick={() => openEditCat(cat)}>✎</Btn>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
                    {formatCurrency(spent)}
                  </div>
                  {cat.budget && (
                    <>
                      <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8 }}>de {formatCurrency(cat.budget)} presupuestado</div>
                      <ProgressBar value={spent} total={cat.budget} height={6} />
                    </>
                  )}
                </div>
              )
            })}

            {/* Nueva categoría */}
            <div
              onClick={openNewCat}
              style={{
                minHeight: 120,
                border: '2px dashed var(--border-default)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-tertiary)',
                transition: 'border-color 0.15s, color 0.15s',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 24 }}>+</span>
              <span style={{ fontSize: 13 }}>Nueva categoría</span>
            </div>
          </div>
        )}
      </div>

      {/* Modal Transacción */}
      <Modal isOpen={txModal} onClose={() => { setTxModal(false); setEditTx(null) }} title={editTx ? 'Editar transacción' : 'Nueva transacción'} size="sm">
        <form onSubmit={saveTx} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Descripción" value={txForm.description} onChange={e => setTxForm(p => ({ ...p, description: e.target.value }))} required placeholder="Ej: Almuerzo" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Monto" type="number" value={txForm.amount} onChange={e => setTxForm(p => ({ ...p, amount: e.target.value }))} required min="0" step="0.01" />
            <SelectInput label="Tipo" value={txForm.type} onChange={e => setTxForm(p => ({ ...p, type: e.target.value as 'gasto' | 'ingreso', category_id: '' }))}>
              <option value="gasto">Gasto</option>
              <option value="ingreso">Ingreso</option>
            </SelectInput>
          </div>
          <Input label="Fecha" type="date" value={txForm.date} onChange={e => setTxForm(p => ({ ...p, date: e.target.value }))} />
          {(() => {
            const filtered = categories.filter(c => txForm.type === 'ingreso' ? c.type === 'ingreso' : c.type === 'egreso')
            return filtered.length > 0 && (
              <SelectInput label="Categoría" value={txForm.category_id} onChange={e => setTxForm(p => ({ ...p, category_id: e.target.value }))}>
                <option value="">Sin categoría</option>
                {filtered.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </SelectInput>
            )
          })()}
          {txError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--red)' }}>
              {txError}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Btn variant="ghost" type="button" onClick={() => { setTxModal(false); setEditTx(null); setTxError(null) }}>Cancelar</Btn>
            <Btn variant="primary" type="submit" loading={saving}>{editTx ? 'Guardar' : 'Agregar'}</Btn>
          </div>
        </form>
      </Modal>

      {/* Modal Categoría */}
      <Modal isOpen={catModal} onClose={() => setCatModal(false)} title={editCat ? 'Editar categoría' : 'Nueva categoría'} size="md">
        <form onSubmit={saveCat} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flexShrink: 0 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Ícono</label>
              <div style={{ width: 52, height: 42, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, background: 'var(--bg-root)' }}>
                {catForm.icon}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <Input label="Nombre" value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} required placeholder="Ej: Comida" />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>Elegí un ícono</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px', background: 'var(--bg-root)', borderRadius: 'var(--radius-sm)', maxHeight: 150, overflowY: 'auto' }}>
              {EMOJI_OPTIONS.map(emoji => (
                <button key={emoji} type="button" onClick={() => setCatForm(p => ({ ...p, icon: emoji }))}
                  style={{ fontSize: 20, background: catForm.icon === emoji ? 'var(--accent-muted)' : 'none', border: catForm.icon === emoji ? '1px solid var(--accent)' : '1px solid transparent', borderRadius: 6, padding: '4px 6px', cursor: 'pointer' }}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <SelectInput label="Tipo de categoría" value={catForm.type} onChange={e => setCatForm(p => ({ ...p, type: e.target.value as 'egreso' | 'ingreso' }))}>
            <option value="egreso">Gasto</option>
            <option value="ingreso">Ingreso</option>
          </SelectInput>
          <Input label="Presupuesto mensual" type="number" value={catForm.budget} onChange={e => setCatForm(p => ({ ...p, budget: e.target.value }))} min="0" step="0.01" placeholder="Opcional" />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Btn variant="ghost" type="button" onClick={() => setCatModal(false)}>Cancelar</Btn>
            <Btn variant="primary" type="submit" loading={saving}>{editCat ? 'Guardar' : 'Crear'}</Btn>
          </div>
        </form>
      </Modal>
    </div>
  )
}
