'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import {
  TrendingUp,
  TrendingDown,
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
  CalendarDays,
  X,
} from 'lucide-react'
import type { Supplier, AccountPayable } from '@/types/database'

const MONTHS = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => ({
  value: String(2020 + i),
  label: String(2020 + i),
}))

export default function WalletPage() {
  const supabase = createClient()

  const [income, setIncome] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [ar, setAr] = useState<any[]>([])
  const [ap, setAp] = useState<AccountPayable[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const [inventoryValue, setInventoryValue] = useState(0)
  const [monthFilter, setMonthFilter] = useState<{ year: number; month: number } | null>(null)

  const [apModalOpen, setApModalOpen] = useState(false)
  const [apForm, setApForm] = useState({ supplier_id: '', amount: 0, description: '', due_date: '' })

  const [incomeTotals, setIncomeTotals] = useState(0)
  const [expenseTotals, setExpenseTotals] = useState(0)
  const [arTotals, setArTotals] = useState(0)
  const [arExpanded, setArExpanded] = useState<Record<string, boolean>>({})
  const [paymentsTotal, setPaymentsTotal] = useState(0)

  const fetchAll = async () => {
    const startDate = monthFilter ? new Date(monthFilter.year, monthFilter.month - 1, 1).toISOString() : null
    const endDate = monthFilter ? new Date(monthFilter.year, monthFilter.month, 1).toISOString() : null
    const wf = (q: any, col: string) => startDate ? q.gte(col, startDate).lt(col, endDate) : q
    const [incomeRes, expensesRes, arRes, apRes, suppliersRes, incomeTotalRes, expenseTotalRes, arTotalRes, paymentsRes, productsRes] = await Promise.all([
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
  }

  useEffect(() => { fetchAll() }, [monthFilter])

  const apTotal = ap.reduce((sum, a) => sum + a.amount, 0)
  const [apShowAll, setApShowAll] = useState(false)
  const netArTotals = Math.max(0, arTotals - paymentsTotal)
  const balance = incomeTotals + paymentsTotal - expenseTotals

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

  const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Wallet</h1>

        {/* Month filter */}
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-[var(--ink-tertiary)]" />
          <select
            value={monthFilter?.month || ''}
            onChange={(e) => {
              const m = Number(e.target.value)
              const y = monthFilter?.year || currentYear
              setMonthFilter(m ? { year: y, month: m } : null)
            }}
            className="px-2.5 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-1)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer"
          >
            <option value="">Todos los meses</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={monthFilter?.year || ''}
            onChange={(e) => {
              const y = Number(e.target.value)
              const m = monthFilter?.month || new Date().getMonth() + 1
              setMonthFilter(y ? { year: y, month: m } : null)
            }}
            className="px-2.5 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-1)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer"
          >
            <option value="">Año</option>
            {YEARS.map((y) => (
              <option key={y.value} value={y.value}>{y.label}</option>
            ))}
          </select>
          {monthFilter && (
            <button
              onClick={() => setMonthFilter(null)}
              className="p-1.5 text-[var(--ink-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"
              title="Limpiar filtro"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Balance hero + summary */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-[var(--ink-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1">
              <TrendingUp size={14} className="text-[var(--success)]" /> Ingresos
            </p>
            <p className="text-lg font-bold text-[var(--success)]">{formatCurrency(incomeTotals + paymentsTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--ink-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1">
              <TrendingDown size={14} className="text-[var(--danger)]" /> Egresos
            </p>
            <p className="text-lg font-bold text-[var(--danger)]">{formatCurrency(expenseTotals)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--ink-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1">
              <User size={14} className="text-[var(--accent)]" /> Por Cobrar
            </p>
            <p className="text-lg font-bold text-[var(--accent)]">{formatCurrency(netArTotals)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--ink-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1">
              <Building2 size={14} className="text-[var(--warning)]" /> Por Pagar
            </p>
            <p className="text-lg font-bold text-[var(--warning)]">{formatCurrency(apTotal)}</p>
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] bg-[var(--tint)] border border-[var(--tint)] p-5 flex flex-col justify-center items-center text-center">
          <p className="text-xs font-medium text-[var(--ink)]/70 uppercase tracking-wide mb-1">Saldo Disponible</p>
          <p className="text-3xl font-bold text-[var(--ink)]">{formatCurrency(balance)}</p>
          <p className="text-xs text-[var(--ink)]/60 mt-1">
            Ingresos − Egresos
          </p>
        </div>
      </div>

      {/* Income + AR */}
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard title="Ingresos" icon={TrendingUp} iconColor="text-[var(--success)]">
          {income.length === 0 && paymentsTotal === 0 ? (
            <p className="text-sm text-[var(--ink-tertiary)] py-4 text-center">No hay ingresos registrados</p>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {income.map((i) => (
                <div key={i.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--ink)] truncate">{i.person_name}</p>
                    <p className="text-xs text-[var(--ink-tertiary)]">
                      {i.products?.name} • {i.quantity} und • {new Date(i.withdrawal_date).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-[var(--success)] shrink-0">
                    +{formatCurrency(i.quantity * (i.products?.price || 0))}
                  </p>
                </div>
              ))}
              {paymentsTotal > 0 && (
                <div className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--ink)] truncate">Pagos recibidos de vendedores</p>
                  </div>
                  <p className="text-sm font-bold text-[var(--success)] shrink-0">
                    +{formatCurrency(paymentsTotal)}
                  </p>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Cuentas por Cobrar" icon={User} iconColor="text-[var(--accent)]">
          {ar.length === 0 ? (
            <p className="text-sm text-[var(--ink-tertiary)] py-4 text-center">No hay cuentas por cobrar</p>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {ar.map((a) => {
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
          )}
        </SectionCard>
      </div>

      {/* Expenses + AP */}
      <div className="grid lg:grid-cols-2 gap-4">
        <SectionCard title="Egresos" icon={TrendingDown} iconColor="text-[var(--danger)]">
          {expenses.length === 0 ? (
            <p className="text-sm text-[var(--ink-tertiary)] py-4 text-center">No hay egresos registrados</p>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {expenses.map((e) => (
                <div key={e.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--ink)] truncate">{e.products?.name || 'Sin producto'}</p>
                    <p className="text-xs text-[var(--ink-tertiary)]">
                      {e.quantity} und • {e.observations || '—'} • {new Date(e.created_at).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-[var(--danger)] shrink-0">
                    -{formatCurrency(e.quantity * (e.products?.cost || 0))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Cuentas por Pagar"
          icon={Building2}
          iconColor="text-[var(--warning)]"
          action={
            <Button size="sm" onClick={() => setApModalOpen(true)}>
              <Plus size={14} /> Agregar Deuda
            </Button>
          }
        >
          {ap.length === 0 ? (
            <p className="text-sm text-[var(--ink-tertiary)] py-4 text-center">No hay cuentas por pagar</p>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {(apShowAll ? ap : ap.slice(0, 2)).map((a) => (
                <div key={a.id} className="py-2.5 flex items-center justify-between gap-2">
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
                      <CheckCircle size={16} />
                    </button>
                    <button
                      onClick={() => deleteAp(a.id)}
                      className="p-1 text-[var(--ink-tertiary)] hover:text-[var(--danger)] rounded-[var(--radius-sm)] cursor-pointer"
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {ap.length > 2 && (
                <button
                  onClick={() => setApShowAll(!apShowAll)}
                  className="w-full py-2 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] hover:underline cursor-pointer text-center"
                >
                  {apShowAll ? 'Ver menos' : `Ver más (${ap.length - 2} restantes)`}
                </button>
              )}
            </div>
          )}
        </SectionCard>
      </div>

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
      <Modal isOpen={apModalOpen} onClose={() => setApModalOpen(false)} title="Agregar Cuenta por Pagar">
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
