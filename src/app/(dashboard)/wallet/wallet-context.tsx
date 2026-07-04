'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { computeDateRange } from '@/components/ui/DateFilter'
import type { DateFilterState } from '@/components/ui/DateFilter'
import type { Supplier, AccountPayable, AdministrativeExpense, OtherIncome } from '@/types/database'

interface WalletContextType {
  income: any[]
  expenses: any[]
  ar: any[]
  ap: AccountPayable[]
  suppliers: Supplier[]
  filter: DateFilterState
  setFilter: (f: DateFilterState) => void
  inventoryValue: number
  adminExpenses: AdministrativeExpense[]
  adminExpenseTotals: number
  adminModalOpen: boolean
  setAdminModalOpen: (v: boolean) => void
  adminForm: { description: string; amount: number | ''; category: string; type: 'fixed' | 'variable'; expense_date: string; notes: string }
  setAdminForm: (v: any) => void
  apModalOpen: boolean
  setApModalOpen: (v: boolean) => void
  apForm: { supplier_id: string; amount: number | ''; description: string; due_date: string }
  setApForm: (v: any) => void
  otherIncome: OtherIncome[]
  otherIncomeTotals: number
  otherIncomeModalOpen: boolean
  setOtherIncomeModalOpen: (v: boolean) => void
  otherIncomeForm: { description: string; amount: number | ''; category: string; income_date: string; notes: string }
  setOtherIncomeForm: (v: any) => void
  incomeTotals: number
  expenseTotals: number
  arTotals: number
  paymentsTotal: number
  apTotal: number
  apShowAll: boolean
  setApShowAll: React.Dispatch<React.SetStateAction<boolean>>
  adminShowAll: boolean
  setAdminShowAll: React.Dispatch<React.SetStateAction<boolean>>
  netArTotals: number
  gastosTotal: number
  balance: number
  handleCreateAp: (e: React.FormEvent) => Promise<void>
  markApAsPaid: (id: string) => Promise<void>
  deleteAp: (id: string) => Promise<void>
  handleCreateAdmin: (e: React.FormEvent) => Promise<void>
  deleteAdmin: (id: string) => Promise<void>
  handleCreateOtherIncome: (e: React.FormEvent) => Promise<void>
  deleteOtherIncome: (id: string) => Promise<void>
  formatCurrency: (n: number) => string
}

const WalletContext = createContext<WalletContextType | null>(null)

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()

  const [income, setIncome] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [ar, setAr] = useState<any[]>([])
  const [ap, setAp] = useState<AccountPayable[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const [filter, setFilter] = useState<DateFilterState>({
    mode: 'month',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    customStart: '',
    customEnd: '',
  })
  const [inventoryValue, setInventoryValue] = useState(0)

  const [adminExpenses, setAdminExpenses] = useState<AdministrativeExpense[]>([])
  const [adminExpenseTotals, setAdminExpenseTotals] = useState(0)
  const [balanceAdminExpenses, setBalanceAdminExpenses] = useState(0)

  const [adminModalOpen, setAdminModalOpen] = useState(false)
  const [adminForm, setAdminForm] = useState<{ description: string; amount: number | ''; category: string; type: 'fixed' | 'variable'; expense_date: string; notes: string }>({ description: '', amount: '', category: '', type: 'variable', expense_date: '', notes: '' })

  const [apModalOpen, setApModalOpen] = useState(false)
  const [apForm, setApForm] = useState<{ supplier_id: string; amount: number | ''; description: string; due_date: string }>({ supplier_id: '', amount: '', description: '', due_date: '' })

  const [otherIncome, setOtherIncome] = useState<OtherIncome[]>([])
  const [otherIncomeTotals, setOtherIncomeTotals] = useState(0)
  const [balanceOtherIncome, setBalanceOtherIncome] = useState(0)
  const [otherIncomeModalOpen, setOtherIncomeModalOpen] = useState(false)
  const [otherIncomeForm, setOtherIncomeForm] = useState({ description: '', amount: '' as number | '', category: '', income_date: '', notes: '' })

  const [incomeTotals, setIncomeTotals] = useState(0)
  const [expenseTotals, setExpenseTotals] = useState(0)
  const [arTotals, setArTotals] = useState(0)
  const [paymentsTotal, setPaymentsTotal] = useState(0)
  const [balanceIncome, setBalanceIncome] = useState(0)
  const [balancePayments, setBalancePayments] = useState(0)
  const [balanceExpenses, setBalanceExpenses] = useState(0)
  const [balanceApTotal, setBalanceApTotal] = useState(0)

  const fetchAll = async () => {
    const { startDate: sd, endDate: ed } = computeDateRange(filter)
    const startDate: string | null = sd ? sd.toISOString() : null
    const endDate: string | null = ed ? ed.toISOString() : null

    const wf = (q: any, col: string) => startDate ? q.gte(col, startDate).lt(col, endDate) : q
    const [incomeRes, expensesRes, arRes, apRes, suppliersRes, incomeTotalRes, expenseTotalRes, arTotalRes, paymentsRes, productsRes, balanceIncomeRes, balancePaymentsRes, balanceExpensesRes, adminExpensesRes, balanceAdminExpensesRes, balanceApTotalRes, otherIncomeRes, balanceOtherIncomeRes] = await Promise.all([
      wf(supabase.from('stock_withdrawals').select('*, products(*)').eq('delivery_type', 'paid'), 'withdrawal_date').order('withdrawal_date', { ascending: false }).limit(10),
      wf(supabase.from('stock_entries').select('*, products(*)'), 'created_at').order('created_at', { ascending: false }).limit(10),
      wf(supabase.from('stock_withdrawals').select('*, products(*), sellers(*)').eq('delivery_type', 'pending').gt('pending_amount', 0), 'withdrawal_date').order('withdrawal_date', { ascending: false }).limit(10),
      wf(supabase.from('accounts_payable').select('*, suppliers(*)').eq('is_paid', false), 'created_at').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').order('name'),
      wf(supabase.from('stock_withdrawals').select('quantity, products!inner(price)').eq('delivery_type', 'paid'), 'withdrawal_date'),
      wf(supabase.from('stock_entries').select('quantity, products!inner(cost)'), 'created_at'),
      wf(supabase.from('stock_withdrawals').select('pending_amount').eq('delivery_type', 'pending').gt('pending_amount', 0), 'withdrawal_date'),
      wf(supabase.from('payments').select('amount'), 'created_at'),
      supabase.from('products').select('price, stock'),
      supabase.from('stock_withdrawals').select('quantity, products!inner(price)').eq('delivery_type', 'paid'),
      supabase.from('payments').select('amount'),
      supabase.from('stock_entries').select('quantity, products!inner(cost)'),
      wf(supabase.from('administrative_expenses').select('*'), 'expense_date').order('expense_date', { ascending: false }),
      supabase.from('administrative_expenses').select('amount'),
      supabase.from('accounts_payable').select('amount').eq('is_paid', false),
      wf(supabase.from('other_income').select('*'), 'income_date').order('income_date', { ascending: false }),
      supabase.from('other_income').select('amount'),
    ])
    if (incomeRes.data) setIncome(incomeRes.data)
    if (expensesRes.data) setExpenses(expensesRes.data)
    if (arRes.data) setAr(arRes.data)
    if (apRes.data) setAp(apRes.data as AccountPayable[])
    if (suppliersRes.data) setSuppliers(suppliersRes.data)
    if (incomeTotalRes.data) setIncomeTotals(incomeTotalRes.data.reduce((s: number, i: any) => s + (i.quantity * (i.products?.price || 0)), 0))
    if (expenseTotalRes.data) setExpenseTotals(expenseTotalRes.data.reduce((s: number, e: any) => s + (e.quantity * (e.products?.cost || 0)), 0))
    if (arTotalRes.data) setArTotals(arTotalRes.data.reduce((s: number, a: any) => s + (a.pending_amount || 0), 0))
    if (paymentsRes.data) setPaymentsTotal(paymentsRes.data.reduce((s: number, p: any) => s + p.amount, 0))
    if (productsRes.data) setInventoryValue(productsRes.data.reduce((s: number, p: any) => s + (p.price * p.stock), 0))
    if (balanceIncomeRes.data) setBalanceIncome(balanceIncomeRes.data.reduce((s: number, i: any) => s + (i.quantity * (i.products?.price || 0)), 0))
    if (balancePaymentsRes.data) setBalancePayments(balancePaymentsRes.data.reduce((s: number, p: any) => s + p.amount, 0))
    if (balanceExpensesRes.data) setBalanceExpenses(balanceExpensesRes.data.reduce((s: number, e: any) => s + (e.quantity * (e.products?.cost || 0)), 0))
    if (adminExpensesRes.data) setAdminExpenses(adminExpensesRes.data as AdministrativeExpense[])
    if (adminExpensesRes.data) setAdminExpenseTotals(adminExpensesRes.data.reduce((s: number, o: any) => s + o.amount, 0))
    if (balanceAdminExpensesRes.data) setBalanceAdminExpenses(balanceAdminExpensesRes.data.reduce((s: number, o: any) => s + o.amount, 0))
    if (balanceApTotalRes.data) setBalanceApTotal(balanceApTotalRes.data.reduce((s: number, a: any) => s + a.amount, 0))
    if (otherIncomeRes.data) setOtherIncome(otherIncomeRes.data as OtherIncome[])
    if (otherIncomeRes.data) setOtherIncomeTotals(otherIncomeRes.data.reduce((s: number, o: any) => s + o.amount, 0))
    if (balanceOtherIncomeRes.data) setBalanceOtherIncome(balanceOtherIncomeRes.data.reduce((s: number, o: any) => s + o.amount, 0))
  }

  useEffect(() => { fetchAll() }, [filter])

  const apTotal = ap.reduce((sum, a) => sum + a.amount, 0)
  const [apShowAll, setApShowAll] = useState(false)
  const netArTotals = Math.max(0, arTotals - balancePayments)
  const gastosTotal = expenseTotals + adminExpenseTotals + apTotal
  const balance = balanceIncome + balancePayments + balanceOtherIncome - balanceExpenses - balanceAdminExpenses - balanceApTotal

  const handleCreateAp = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = {
      amount: apForm.amount === '' ? 0 : apForm.amount,
      description: apForm.description || null,
      due_date: apForm.due_date || null,
    }
    if (apForm.supplier_id) payload.supplier_id = apForm.supplier_id
    await supabase.from('accounts_payable').insert(payload)
    setApModalOpen(false)
    setApForm({ supplier_id: '', amount: '', description: '', due_date: '' })
    fetchAll()
  }

  const markApAsPaid = async (id: string) => {
    await supabase.from('accounts_payable').update({ is_paid: true }).eq('id', id)
    fetchAll()
  }

  const deleteAp = async (id: string) => {
    if (!confirm('¿Eliminar esta deuda?')) return
    await supabase.from('accounts_payable').delete().eq('id', id)
    fetchAll()
  }

  const [adminShowAll, setAdminShowAll] = useState(false)
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      description: adminForm.description,
      amount: adminForm.amount === '' ? 0 : adminForm.amount,
      category: adminForm.category || null,
      type: adminForm.type,
      expense_date: adminForm.expense_date || null,
      notes: adminForm.notes || null,
    }
    await supabase.from('administrative_expenses').insert(payload)
    setAdminModalOpen(false)
    setAdminForm({ description: '', amount: '', category: '', type: 'variable', expense_date: '', notes: '' })
    fetchAll()
  }

  const handleCreateOtherIncome = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('other_income').insert({
      description: otherIncomeForm.description,
      amount: otherIncomeForm.amount === '' ? 0 : otherIncomeForm.amount,
      category: otherIncomeForm.category || 'other',
      income_date: otherIncomeForm.income_date || new Date().toISOString().split('T')[0],
      notes: otherIncomeForm.notes || null,
      created_by: user.id,
    })
    setOtherIncomeModalOpen(false)
    setOtherIncomeForm({ description: '', amount: '', category: '', income_date: '', notes: '' })
    fetchAll()
  }

  const deleteOtherIncome = async (id: string) => {
    if (!confirm('¿Eliminar este ingreso?')) return
    await supabase.from('other_income').delete().eq('id', id)
    fetchAll()
  }

  const deleteAdmin = async (id: string) => {
    if (!confirm('¿Eliminar este gasto administrativo?')) return
    await supabase.from('administrative_expenses').delete().eq('id', id)
    fetchAll()
  }

  const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <WalletContext.Provider
      value={{
        income, expenses, ar, ap, suppliers, filter, setFilter, inventoryValue,
        adminExpenses, adminExpenseTotals,
        adminModalOpen, setAdminModalOpen, adminForm, setAdminForm,
        apModalOpen, setApModalOpen, apForm, setApForm,
        otherIncome, otherIncomeTotals, otherIncomeModalOpen, setOtherIncomeModalOpen, otherIncomeForm, setOtherIncomeForm,
        incomeTotals, expenseTotals, arTotals,
        paymentsTotal, apTotal, apShowAll, setApShowAll, adminShowAll, setAdminShowAll,
        netArTotals, gastosTotal, balance,
        handleCreateAp, markApAsPaid, deleteAp,
        handleCreateAdmin, deleteAdmin,
        handleCreateOtherIncome, deleteOtherIncome,
        formatCurrency,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}
