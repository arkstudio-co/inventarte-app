'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { DateFilter, computeDateRange } from '@/components/ui/DateFilter'
import type { DateFilterState } from '@/components/ui/DateFilter'
import {
  TrendingUp,
  Plus,
  Trash2,
  CheckCircle,
  User,
  Building2,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  Package,
} from 'lucide-react'
import type { Supplier, AccountPayable, AdministrativeExpense } from '@/types/database'

export default function WalletPage() {
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
  const [adminForm, setAdminForm] = useState({ description: '', amount: 0, category: '', type: 'variable' as 'fixed' | 'variable', expense_date: '', notes: '' })

  const [apModalOpen, setApModalOpen] = useState(false)
  const [apForm, setApForm] = useState({ supplier_id: '', amount: 0, description: '', due_date: '' })

  const [incomeTotals, setIncomeTotals] = useState(0)
  const [expenseTotals, setExpenseTotals] = useState(0)
  const [arTotals, setArTotals] = useState(0)
  const [arExpanded, setArExpanded] = useState<Record<string, boolean>>({})
  const [arShowAll, setArShowAll] = useState(false)
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
    const [incomeRes, expensesRes, arRes, apRes, suppliersRes, incomeTotalRes, expenseTotalRes, arTotalRes, paymentsRes, productsRes, balanceIncomeRes, balancePaymentsRes, balanceExpensesRes, adminExpensesRes, balanceAdminExpensesRes, balanceApTotalRes] = await Promise.all([
      wf(supabase.from('stock_withdrawals').select('*, products(*)').eq('delivery_type', 'paid'), 'withdrawal_date').order('withdrawal_date', { ascending: false }).limit(10),
      wf(supabase.from('stock_entries').select('*, products(*)'), 'created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('stock_withdrawals').select('*, products(*), sellers(*)').eq('delivery_type', 'pending').gt('pending_amount', 0).order('withdrawal_date', { ascending: false }).limit(10),
      wf(supabase.from('accounts_payable').select('*, suppliers(*)').eq('is_paid', false), 'created_at').order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').order('name'),
      wf(supabase.from('stock_withdrawals').select('quantity, products!inner(price)').eq('delivery_type', 'paid'), 'withdrawal_date'),
      wf(supabase.from('stock_entries').select('quantity, products!inner(cost)'), 'created_at'),
      supabase.from('stock_withdrawals').select('pending_amount').eq('delivery_type', 'pending').gt('pending_amount', 0),
      wf(supabase.from('payments').select('amount'), 'created_at'),
      supabase.from('products').select('price, stock'),
      supabase.from('stock_withdrawals').select('quantity, products!inner(price)').eq('delivery_type', 'paid'),
      supabase.from('payments').select('amount'),
      supabase.from('stock_entries').select('quantity, products!inner(cost)'),
      wf(supabase.from('administrative_expenses').select('*'), 'expense_date').order('expense_date', { ascending: false }),
      supabase.from('administrative_expenses').select('amount'),
      supabase.from('accounts_payable').select('amount').eq('is_paid', false),
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
  }

  useEffect(() => { fetchAll() }, [filter])

  const apTotal = ap.reduce((sum, a) => sum + a.amount, 0)
  const [apShowAll, setApShowAll] = useState(false)
  const netArTotals = Math.max(0, arTotals - balancePayments)
  const gastosTotal = expenseTotals + adminExpenseTotals + apTotal
  const balance = balanceIncome + balancePayments - balanceExpenses - balanceAdminExpenses - balanceApTotal
  const handleCreateAp = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload: any = {
      amount: apForm.amount,
      description: apForm.description || null,
      due_date: apForm.due_date || null,
    }
    if (apForm.supplier_id) payload.supplier_id = apForm.supplier_id
    await supabase.from('accounts_payable').insert(payload)
    setApModalOpen(false)
    setApForm({ supplier_id: '', amount: 0, description: '', due_date: '' })
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
      amount: adminForm.amount,
      category: adminForm.category || null,
      type: adminForm.type,
      expense_date: adminForm.expense_date || null,
      notes: adminForm.notes || null,
    }
    await supabase.from('administrative_expenses').insert(payload)
    setAdminModalOpen(false)
    setAdminForm({ description: '', amount: 0, category: '', type: 'variable', expense_date: '', notes: '' })
    fetchAll()
  }

  const deleteAdmin = async (id: string) => {
    if (!confirm('¿Eliminar este gasto administrativo?')) return
    await supabase.from('administrative_expenses').delete().eq('id', id)
    fetchAll()
  }

  const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Wallet</h1>

        <DateFilter value={filter} onChange={setFilter} />
      </div>

      {/* Balance hero + summary */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-[var(--ink-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1">
              <TrendingUp size={14} className="text-[var(--success)]" /> Ingresos
            </p>
            <p className="text-lg font-bold text-[var(--success)]">{formatCurrency(incomeTotals + paymentsTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--ink-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1">
              <User size={14} className="text-[var(--accent)]" /> Por Cobrar
            </p>
            <p className="text-lg font-bold text-[var(--accent)]">{formatCurrency(netArTotals)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--ink-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1">
              <Building2 size={14} className="text-[var(--warning)]" /> Gastos
            </p>
            <p className="text-lg font-bold text-[var(--warning)]">{formatCurrency(gastosTotal)}</p>
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] bg-[var(--tint)] border border-[var(--tint)] p-5 flex flex-col justify-center items-center text-center">
          <p className="text-xs font-medium text-[var(--ink)]/70 uppercase tracking-wide mb-1">Saldo Disponible</p>
          <p className="text-3xl font-bold text-[var(--ink)]">{formatCurrency(balance)}</p>
        </div>
      </div>

      {/* Income + AR */}
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard title="Ingresos" icon={TrendingUp} iconColor="text-[var(--success)]">
          {income.length === 0 && paymentsTotal === 0 ? (
            <p className="text-sm text-[var(--ink-tertiary)] py-4 text-center">No hay ingresos registrados</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-[var(--ink-secondary)]">Ventas directas</span>
                <span className="font-semibold text-[var(--success)]">{formatCurrency(incomeTotals)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--ink-secondary)]">Abonos de vendedores</span>
                <span className="font-semibold text-[var(--success)]">{formatCurrency(paymentsTotal)}</span>
              </div>
              <div className="flex items-center justify-between font-semibold pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-[var(--ink)]">Total Ingresos</span>
                <span className="text-[var(--success)]">{formatCurrency(incomeTotals + paymentsTotal)}</span>
              </div>
              {incomeTotals > 0 && paymentsTotal > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <div
                      className="bg-[var(--success)] rounded-l-full transition-all"
                      style={{ width: `${(incomeTotals / (incomeTotals + paymentsTotal)) * 100}%` }}
                    />
                    <div
                      className="bg-[var(--accent)] rounded-r-full transition-all"
                      style={{ width: `${(paymentsTotal / (incomeTotals + paymentsTotal)) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-[var(--ink-tertiary)]">
                    <span>Ventas directas {((incomeTotals / (incomeTotals + paymentsTotal)) * 100).toFixed(0)}%</span>
                    <span>{((paymentsTotal / (incomeTotals + paymentsTotal)) * 100).toFixed(0)}% Abonos</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Cuentas por Cobrar" icon={User} iconColor="text-[var(--accent)]">
          {ar.length === 0 ? (
            <p className="text-sm text-[var(--ink-tertiary)] py-4 text-center">No hay cuentas por cobrar</p>
          ) : (
            <>
              <div className="divide-y divide-[var(--border-subtle)]">
                {(arShowAll ? ar : ar.slice(0, 2)).map((a) => {
                  const isExpanded = arExpanded[a.id]
                  const seller = a.sellers
                  return (
                    <div key={a.id}>
                      <button
                        onClick={() => setArExpanded((prev) => ({ ...prev, [a.id]: !prev[a.id] }))}
                        className="w-full py-2.5 flex items-center justify-between gap-2 hover:bg-[var(--surface-2)]/30 transition-colors cursor-pointer text-left"
                      >
                        <div className="min-w-0 flex-1 flex items-center gap-2">
                          {isExpanded ? <ChevronDown size={14} className="text-[var(--ink-tertiary)] shrink-0" /> : <ChevronRight size={14} className="text-[var(--ink-tertiary)] shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[var(--ink)] truncate">{seller?.name || a.person_name}</p>
                            <p className="text-xs text-[var(--ink-tertiary)]">
                              {a.products?.name} • {new Date(a.withdrawal_date).toLocaleDateString('es-CO')}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-[var(--accent)] shrink-0">
                          {formatCurrency(a.pending_amount)}
                        </p>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 space-y-1.5 text-xs text-[var(--ink-secondary)] bg-[var(--surface-0)] rounded-[var(--radius-sm)] mx-1 mb-2">
                          {seller ? (
                            <>
                              <p><span className="font-medium text-[var(--ink)]">Nombre:</span> {seller.name}</p>
                              {seller.email && <p className="flex items-center gap-1"><Mail size={12} /> {seller.email}</p>}
                              {seller.phone && <p className="flex items-center gap-1"><Phone size={12} /> {seller.phone}</p>}
                              {seller.notes && <p><span className="font-medium text-[var(--ink)]">Notas:</span> {seller.notes}</p>}
                            </>
                          ) : (
                            <>
                              <p><span className="font-medium text-[var(--ink)]">Nombre:</span> {a.person_name}</p>
                              {a.person_email && <p className="flex items-center gap-1"><Mail size={12} /> {a.person_email}</p>}
                            </>
                          )}
                          <p><span className="font-medium text-[var(--ink)]">Producto:</span> {a.products?.name}</p>
                          <p><span className="font-medium text-[var(--ink)]">Cantidad:</span> {a.quantity} und</p>
                          <p><span className="font-medium text-[var(--ink)]">Fecha de retiro:</span> {new Date(a.withdrawal_date).toLocaleDateString('es-CO')}</p>
                          <p><span className="font-medium text-[var(--ink)]">Monto pendiente:</span> {formatCurrency(a.pending_amount)}</p>
                          {a.observations && <p><span className="font-medium text-[var(--ink)]">Observaciones:</span> {a.observations}</p>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {ar.length > 2 && (
                <button
                  onClick={() => setArShowAll(!arShowAll)}
                  className="w-full mt-2 py-2 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] hover:underline cursor-pointer text-center"
                >
                  {arShowAll ? 'Ver menos' : 'Ver más'}
                </button>
              )}
            </>
          )}
        </SectionCard>
      </div>

      {/* Gastos: unified section */}
      <SectionCard
        title="Gastos"
        icon={Building2}
        iconColor="text-[var(--warning)]"
        action={
          <div className="flex items-center gap-1.5">
            <Button size="sm" onClick={() => setAdminModalOpen(true)}>
              <Plus size={14} /> Gasto Administrativo
            </Button>
            <Button size="sm" onClick={() => setApModalOpen(true)}>
              <Plus size={14} /> Deuda
            </Button>
          </div>
        }
      >
        {/* Summary rows */}
        <div className="space-y-1 pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--ink-secondary)]">Gastos Operativos (Inventario)</span>
            <span className="font-semibold text-[var(--danger)]">{formatCurrency(expenseTotals)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--ink-secondary)]">Gastos Administrativos</span>
            <span className="font-semibold text-[var(--warning)]">{formatCurrency(adminExpenseTotals)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--ink-secondary)]">Deuda</span>
            <span className="font-semibold text-[var(--warning)]">{formatCurrency(apTotal)}</span>
          </div>
          <div className="flex items-center justify-between text-sm font-semibold pt-1 border-t border-[var(--border-subtle)]">
            <span className="text-[var(--ink)]">Total Gastos</span>
            <span className="text-[var(--ink)]">{formatCurrency(gastosTotal)}</span>
          </div>
        </div>

        {/* Gastos Administrativos detail */}
        {adminExpenses.length > 0 && (
          <div className="pt-3">
            <p className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wide mb-2">Gastos Administrativos</p>
            <div className="divide-y divide-[var(--border-subtle)]">
              {(adminShowAll ? adminExpenses : adminExpenses.slice(0, 2)).map((o) => (
                <div key={o.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--ink)] truncate">
                      {o.description}
                      <span className={`ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        o.type === 'fixed'
                          ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                          : 'bg-[var(--accent)]/10 text-[var(--accent)]'
                      }`}>
                        {o.type === 'fixed' ? 'Fijo' : 'Variable'}
                      </span>
                    </p>
                    <p className="text-xs text-[var(--ink-tertiary)]">
                      {o.category || '—'} • {o.expense_date ? new Date(o.expense_date).toLocaleDateString('es-CO') : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-sm font-bold text-[var(--warning)]">{formatCurrency(o.amount)}</p>
                    <button
                      onClick={() => deleteAdmin(o.id)}
                      className="p-1 text-[var(--ink-tertiary)] hover:text-[var(--danger)] rounded-[var(--radius-sm)] cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deuda detail */}
        {ap.length > 0 && (
          <div className="pt-3">
            <p className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wide mb-2">Cuentas por Pagar</p>
            <div className="divide-y divide-[var(--border-subtle)]">
              {(apShowAll ? ap : ap.slice(0, 2)).map((a) => (
                <div key={a.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--ink)] truncate">{a.suppliers?.name || 'Proveedor'}</p>
                    <p className="text-xs text-[var(--ink-tertiary)]">
                      {a.description || '—'}
                      {a.due_date && ` • Vence: ${new Date(a.due_date).toLocaleDateString('es-CO')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-sm font-bold text-[var(--warning)]">{formatCurrency(a.amount)}</p>
                    <button
                      onClick={() => markApAsPaid(a.id)}
                      className="p-1 text-[var(--ink-tertiary)] hover:text-[var(--success)] rounded-[var(--radius-sm)] cursor-pointer"
                      title="Marcar como pagada"
                    >
                      <CheckCircle size={14} />
                    </button>
                    <button
                      onClick={() => deleteAp(a.id)}
                      className="p-1 text-[var(--ink-tertiary)] hover:text-[var(--danger)] rounded-[var(--radius-sm)] cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show more toggle */}
        {(adminExpenses.length > 2 || ap.length > 2) && (
          <button
            onClick={() => setAdminShowAll(!adminShowAll)}
            className="w-full mt-2 py-2 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] hover:underline cursor-pointer text-center"
          >
            {adminShowAll ? 'Ver menos' : 'Ver más'}
          </button>
        )}

        {adminExpenses.length === 0 && ap.length === 0 && (
          <p className="text-sm text-[var(--ink-tertiary)] py-4 text-center">No hay gastos registrados</p>
        )}
      </SectionCard>

      {/* Valor del Inventario */}
      <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
        <div className="flex items-center gap-2 mb-1">
          <Package size={18} className="text-[var(--ink-tertiary)]" />
          <h3 className="text-sm font-semibold text-[var(--ink)]">Valor del Inventario</h3>
        </div>
        <p className="text-2xl font-bold text-[var(--ink)]">{formatCurrency(inventoryValue)}</p>
        <p className="text-xs text-[var(--ink-tertiary)] mt-0.5">Suma total de precio × stock de todos los productos</p>
      </div>

      {/* Modal: Add AP */}
      <Modal isOpen={apModalOpen} onClose={() => setApModalOpen(false)} title="Agregar Gasto">
        <form onSubmit={handleCreateAp} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Proveedor</label>
            <select
              value={apForm.supplier_id}
              onChange={(e) => setApForm({ ...apForm, supplier_id: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="">Seleccionar proveedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <Input label="Monto" type="number" value={apForm.amount} onChange={(e) => setApForm({ ...apForm, amount: Number(e.target.value) })} required min={1} />
          <Input label="Descripción" value={apForm.description} onChange={(e) => setApForm({ ...apForm, description: e.target.value })} />
          <Input label="Fecha de vencimiento" type="date" value={apForm.due_date} onChange={(e) => setApForm({ ...apForm, due_date: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setApModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Crear Deuda</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Operational Expense */}
      <Modal isOpen={adminModalOpen} onClose={() => setAdminModalOpen(false)} title="Agregar Gasto Administrativo">
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <Input label="Descripción" value={adminForm.description} onChange={(e) => setAdminForm({ ...adminForm, description: e.target.value })} required />
          <Input label="Monto" type="number" value={adminForm.amount} onChange={(e) => setAdminForm({ ...adminForm, amount: Number(e.target.value) })} required min={1} />
          <Input label="Categoría" value={adminForm.category} onChange={(e) => setAdminForm({ ...adminForm, category: e.target.value })} placeholder="ej. Arriendo, Servicios, Papelería" />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Tipo</label>
            <select
              value={adminForm.type}
              onChange={(e) => setAdminForm({ ...adminForm, type: e.target.value as 'fixed' | 'variable' })}
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="variable">Gasto Variable</option>
              <option value="fixed">Gasto Fijo</option>
            </select>
          </div>
          <Input label="Fecha del gasto" type="date" value={adminForm.expense_date} onChange={(e) => setAdminForm({ ...adminForm, expense_date: e.target.value })} />
          <Input label="Notas" value={adminForm.notes} onChange={(e) => setAdminForm({ ...adminForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAdminModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Crear Gasto</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function SectionCard({ title, icon: Icon, iconColor, children, action }: {
  title: string
  icon: any
  iconColor: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={18} className={iconColor} />
          <h3 className="text-sm font-semibold text-[var(--ink)]">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}





