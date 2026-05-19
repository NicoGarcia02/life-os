'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { FinanceCategory, Transaction } from '@/lib/types'

export function useFinances() {
  const [categories, setCategories] = useState<FinanceCategory[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchAll = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [catsRes, txRes] = await Promise.all([
      supabase.from('finance_categories').select('*').eq('user_id', user.id).order('name'),
      supabase.from('transactions').select('*, finance_categories(*)').eq('user_id', user.id).order('date', { ascending: false }).order('created_at', { ascending: false }),
    ])
    setCategories(catsRes.data ?? [])
    setTransactions(txRes.data ?? [])
    setLoading(false)
  }, [])

  const addTransaction = useCallback(async (tx: Pick<Transaction, 'description' | 'amount' | 'type' | 'date' | 'category_id'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('transactions').insert({ ...tx, user_id: user.id })
    await fetchAll()
  }, [fetchAll])

  const deleteTransaction = useCallback(async (id: string) => {
    await supabase.from('transactions').delete().eq('id', id)
    await fetchAll()
  }, [fetchAll])

  const addCategory = useCallback(async (cat: Pick<FinanceCategory, 'name' | 'icon' | 'budget'>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('finance_categories').insert({ ...cat, user_id: user.id })
    await fetchAll()
  }, [fetchAll])

  const updateCategory = useCallback(async (id: string, updates: Partial<FinanceCategory>) => {
    await supabase.from('finance_categories').update(updates).eq('id', id)
    await fetchAll()
  }, [fetchAll])

  useEffect(() => { fetchAll() }, [fetchAll])

  const now = new Date()
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthTx = transactions.filter(t => t.date?.startsWith(monthStr))
  const monthIncome = monthTx.filter(t => t.type === 'ingreso').reduce((s, t) => s + t.amount, 0)
  const monthExpense = monthTx.filter(t => t.type === 'gasto').reduce((s, t) => s + t.amount, 0)
  const monthBalance = monthIncome - monthExpense

  return {
    categories, transactions, monthTx, monthIncome, monthExpense, monthBalance,
    loading, addTransaction, deleteTransaction, addCategory, updateCategory, refetch: fetchAll
  }
}
