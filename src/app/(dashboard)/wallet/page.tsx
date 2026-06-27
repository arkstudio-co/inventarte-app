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
} from 'lucide-react'
import type { Supplier, AccountPayable } from '@/types/database'

export default function WalletPage() {
  const supabase = createClient()

  const [income, setIncome] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [ar, setAr] = useState<any[]>([])
  const [ap, setAp] = useState<AccountPayable[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const [apModalOpen, setApModalOpen] = useState(false)
  const [apForm, setApForm] = useState({ supplier_id: '', amount: 0, description: '', due_date: '' })

  const [incomeTotals, setIncomeTotals] = useState(0)
  const [expenseTotals, setExpenseTotals] = useState(0)
  const [arTotals, setArTotals] = useState(0)

  const fetchAll = async () => {
    const [incomeRes, expensesRes, arRes, apRes, suppliersRes, incomeTotalRes, expenseTotalRes, arTotalRes] = await Promise.all([
      supabase.from('stock_withdrawals').select('*, products(*)').eq('delivery_type', 'paid').order('withdrawal_date', { ascending: false }).limit(10),
      supabase.from('stock_entries').select('*, products(*)').order('created_at', { ascending: false }).limit(10),
      supabase.from('stock_withdrawals').select('*, products(*)').eq('delivery_type', 'pending').gt('pending_amount', 0).order('withdrawal_date', { ascending: false }).limit(10),
      supabase.from('accounts_payable').select('*, suppliers(*)').eq('is_paid', false).order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('stock_withdrawals').select('quantity, products!inner(price)').eq('delivery_type', 'paid'),
      supabase.from('stock_entries').select('quantity, products!inner(cost)'),
      supabase.from('stock_withdrawals').select('pending_amount').eq('delivery_type', 'pending').gt('pending_amount', 0),
    ])
    if (incomeRes.data) setIncome(incomeRes.data)
    if (expensesRes.data) setExpenses(expensesRes.data)
    if (arRes.data) setAr(arRes.data)
    if (apRes.data) setAp(apRes.data as AccountPayable[])
    if (suppliersRes.data) setSuppliers(suppliersRes.data)
    if (incomeTotalRes.data) setIncomeTotals(incomeTotalRes.data.reduce((s, i: any) => s + (i.quantity * (i.products?.price || 0)), 0))
    if (expenseTotalRes.data) setExpenseTotals(expenseTotalRes.data.reduce((s, e: any) => s + (e.quantity * (e.products?.cost || 0)), 0))
    if (arTotalRes.data) setArTotals(arTotalRes.data.reduce((s, a: any) => s + (a.pending_amount || 0), 0))
  }

  useEffect(() => { fetchAll() }, [])

  const apTotal = ap.reduce((sum, a) => sum + a.amount, 0)
  const balance = incomeTotals - expenseTotals

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
      <h1 className="text-xl font-semibold text-[var(--ink)]">Wallet</h1>

      {/* Balance hero + summary */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-[var(--ink-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1">
              <TrendingUp size={14} className="text-[var(--success)]" /> Ingresos
            </p>
            <p className="text-lg font-bold text-[var(--success)]">{formatCurrency(incomeTotals)}</p>
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
            <p className="text-lg font-bold text-[var(--accent)]">{formatCurrency(arTotals)}</p>
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
          {income.length === 0 ? (
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
            </div>
          )}
        </SectionCard>

        <SectionCard title="Cuentas por Cobrar" icon={User} iconColor="text-[var(--accent)]">
          {ar.length === 0 ? (
            <p className="text-sm text-[var(--ink-tertiary)] py-4 text-center">No hay cuentas por cobrar</p>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {ar.map((a) => (
                <div key={a.id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--ink)] truncate">{a.person_name}</p>
                    <p className="text-xs text-[var(--ink-tertiary)]">
                      {a.products?.name} • {new Date(a.withdrawal_date).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-[var(--accent)] shrink-0">
                    {formatCurrency(a.pending_amount)}
                  </p>
                </div>
              ))}
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
              {ap.map((a) => (
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
            </div>
          )}
        </SectionCard>
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
