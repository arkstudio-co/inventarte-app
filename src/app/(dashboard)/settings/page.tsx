'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { DateFilter, computeDateRange } from '@/components/ui/DateFilter'
import type { DateFilterState } from '@/components/ui/DateFilter'
import { useCompany } from '@/providers/CompanyProvider'
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Trash2,
  Edit,
  CheckCircle,
  Building2,
} from 'lucide-react'
import type { AdministrativeExpense, AccountPayable, Supplier } from '@/types/database'

type ActiveTab = 'fixed' | 'variable' | 'debt'

export default function ConceptoGastosPage() {
  const supabase = createClient()
  const { companyId } = useCompany()

  const [expenses, setExpenses] = useState<AdministrativeExpense[]>([])
  const [ap, setAp] = useState<AccountPayable[]>([])
  const [activeTab, setActiveTab] = useState<ActiveTab>('fixed')
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<DateFilterState>({
    mode: 'month',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    customStart: '',
    customEnd: '',
  })
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<AdministrativeExpense | null>(null)
  const [expenseForm, setExpenseForm] = useState<{
    description: string
    amount: number | ''
    category: string
    type: 'fixed' | 'variable'
    expense_date: string
    notes: string
  }>({
    description: '',
    amount: '',
    category: '',
    type: 'variable',
    expense_date: '',
    notes: '',
  })

  const [showApModal, setShowApModal] = useState(false)
  const [apForm, setApForm] = useState<{ supplier_id: string; amount: number | ''; description: string; due_date: string; installments: number }>({ supplier_id: '', amount: '', description: '', due_date: '', installments: 1 })
  const [apError, setApError] = useState('')

  const [error, setError] = useState('')

  const fetchData = async () => {
    setIsLoading(true)
    const { startDate: sd, endDate: ed } = computeDateRange(filter)
    const startDate = sd ? sd.toISOString() : null
    const endDate = ed ? ed.toISOString() : null

    let expensesQuery = supabase.from('administrative_expenses').select('*')
    if (startDate) {
      expensesQuery = expensesQuery.or(`and(expense_date.gte.${startDate},expense_date.lt.${endDate},type.eq.variable),and(type.eq.fixed,expense_date.lte.${endDate})`)
    }
    expensesQuery = expensesQuery.order('created_at', { ascending: false })

    const [expensesRes, apRes, suppliersRes] = await Promise.all([
      expensesQuery,
      supabase.from('accounts_payable').select('*, suppliers(*)').eq('is_paid', false).order('created_at', { ascending: false }),
      supabase.from('suppliers').select('*').order('name'),
    ])
    if (expensesRes.data) setExpenses(expensesRes.data as AdministrativeExpense[])
    if (apRes.data) setAp(apRes.data as AccountPayable[])
    if (suppliersRes.data) setSuppliers(suppliersRes.data)
    setIsLoading(false)
  }

  useEffect(() => { fetchData() }, [filter])

  const fixedExpenses = expenses.filter((e) => e.type === 'fixed')
  const variableExpenses = expenses.filter((e) => e.type === 'variable')

  const fixedTotal = fixedExpenses.reduce((s, e) => s + e.amount, 0)
  const variableTotal = variableExpenses.reduce((s, e) => s + e.amount, 0)

  const openNewExpense = (type: 'fixed' | 'variable') => {
    setEditingExpense(null)
    setExpenseForm({
      description: '',
      amount: '',
      category: '',
      type,
      expense_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
    setShowExpenseModal(true)
  }

  const openEditExpense = (exp: AdministrativeExpense) => {
    setEditingExpense(exp)
    setExpenseForm({
      description: exp.description,
      amount: exp.amount,
      category: exp.category,
      type: exp.type,
      expense_date: exp.expense_date,
      notes: exp.notes || '',
    })
    setShowExpenseModal(true)
  }

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const payload = {
      description: expenseForm.description,
      amount: expenseForm.amount === '' ? 0 : expenseForm.amount,
      category: expenseForm.category || 'other',
      type: expenseForm.type,
      expense_date: expenseForm.expense_date,
      notes: expenseForm.notes || null,
      company_id: companyId,
    }

    if (editingExpense) {
      const { error: updateError } = await supabase
        .from('administrative_expenses')
        .update(payload)
        .eq('id', editingExpense.id)
      if (updateError) { setError(updateError.message); return }
    } else {
      const { error: insertError } = await supabase
        .from('administrative_expenses')
        .insert(payload)
      if (insertError) { setError(insertError.message); return }
    }

    setShowExpenseModal(false)
    setEditingExpense(null)
    fetchData()
  }

  const deleteExpense = async (id: string) => {
    if (!confirm('¿Eliminar este gasto?')) return
    await supabase.from('administrative_expenses').delete().eq('id', id)
    fetchData()
  }

  const handleCreateAp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return
    setApError('')

    const totalAmount = apForm.amount === '' ? 0 : apForm.amount
    const numInstallments = apForm.installments || 1
    const installmentAmount = totalAmount / numInstallments
    const groupId = crypto.randomUUID()

    const records = Array.from({ length: numInstallments }, (_, i) => {
      const due = apForm.due_date
        ? new Date(apForm.due_date)
        : new Date()
      if (i > 0) due.setMonth(due.getMonth() + i)

      const record: any = {
        company_id: companyId,
        amount: installmentAmount,
        description: apForm.description || null,
        due_date: due.toISOString(),
        installment_number: numInstallments > 1 ? i + 1 : null,
        total_installments: numInstallments > 1 ? numInstallments : null,
        installment_group_id: numInstallments > 1 ? groupId : null,
      }
      if (apForm.supplier_id) record.supplier_id = apForm.supplier_id
      return record
    })

    const { error: insertError } = await supabase.from('accounts_payable').insert(records)
    if (insertError) { setApError(insertError.message); return }
    setShowApModal(false)
    setApForm({ supplier_id: '', amount: '', description: '', due_date: '', installments: 1 })
    fetchData()
  }

  const markApAsPaid = async (id: string) => {
    await supabase.from('accounts_payable').update({ is_paid: true }).eq('id', id)
    fetchData()
  }

  const deleteAp = async (id: string, groupId?: string | null) => {
    if (groupId) {
      if (!confirm('¿Eliminar todas las cuotas de esta deuda?')) return
      await supabase.from('accounts_payable').delete().eq('installment_group_id', groupId)
    } else {
      if (!confirm('¿Eliminar esta deuda?')) return
      await supabase.from('accounts_payable').delete().eq('id', id)
    }
    fetchData()
  }

  const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const ExpenseCard = ({ expense }: { expense: AdministrativeExpense }) => (
    <div className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--surface-2)]/30 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-[var(--ink)] truncate">{expense.description}</p>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
            expense.type === 'fixed'
              ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
              : 'bg-[var(--accent)]/10 text-[var(--accent)]'
          }`}>
            {expense.type === 'fixed' ? 'Fijo' : 'Variable'}
          </span>
        </div>
        <p className="text-xs text-[var(--ink-tertiary)] mt-0.5">
          {expense.category}
          {expense.expense_date && ` · ${expense.expense_date.split('-').reverse().join('/')}`}
          {expense.notes && ` · ${expense.notes}`}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <p className="text-sm font-bold text-[var(--ink)]">{formatCurrency(expense.amount)}</p>
        <button
          onClick={() => openEditExpense(expense)}
          className="p-1 text-[var(--ink-tertiary)] hover:text-[var(--tint)] hover:bg-[var(--tint-light)] rounded-[var(--radius-sm)] cursor-pointer transition-colors"
          title="Editar"
        >
          <Edit size={14} />
        </button>
        <button
          onClick={() => deleteExpense(expense.id)}
          className="p-1 text-[var(--ink-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] rounded-[var(--radius-sm)] cursor-pointer transition-colors"
          title="Eliminar"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Concepto de Gastos</h1>
        <DateFilter value={filter} onChange={setFilter} />
      </div>

      {/* Tabs: Fijos / Variables / Deuda */}
      <div className="flex items-center gap-1 rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-1">
        <button
          onClick={() => setActiveTab('fixed')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
            activeTab === 'fixed'
              ? 'bg-[var(--surface-0)] text-[var(--ink)] font-medium shadow-sm'
              : 'text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)]'
          }`}
        >
          <TrendingUp size={16} />
          Gastos Fijos
          {fixedExpenses.length > 0 && (
            <span className="text-xs text-[var(--ink-muted)]">({fixedExpenses.length})</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('variable')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
            activeTab === 'variable'
              ? 'bg-[var(--surface-0)] text-[var(--ink)] font-medium shadow-sm'
              : 'text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)]'
          }`}
        >
          <TrendingDown size={16} />
          Gastos Variables
          {variableExpenses.length > 0 && (
            <span className="text-xs text-[var(--ink-muted)]">({variableExpenses.length})</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('debt')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
            activeTab === 'debt'
              ? 'bg-[var(--surface-0)] text-[var(--ink)] font-medium shadow-sm'
              : 'text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)]'
          }`}
        >
          <Building2 size={16} />
          Deuda
          {ap.length > 0 && (
            <span className="text-xs text-[var(--ink-muted)]">({ap.length})</span>
          )}
        </button>
      </div>

      {isLoading ? (
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-8 text-center">
          <p className="text-sm text-[var(--ink-tertiary)]">Cargando...</p>
        </div>
      ) : (
        <>
          {/* Gastos Fijos */}
          {activeTab === 'fixed' && (
            <div className="space-y-3">
              <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">Gastos Fijos</p>
                    <p className="text-xs text-[var(--ink-tertiary)]">
                      {fixedExpenses.length} concepto{fixedExpenses.length !== 1 ? 's' : ''}
                      {fixedTotal > 0 && ` · Total: ${formatCurrency(fixedTotal)}`}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => openNewExpense('fixed')}>
                    <Plus size={14} /> Agregar
                  </Button>
                </div>
                {fixedExpenses.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <TrendingUp size={32} className="mx-auto mb-2 text-[var(--ink-muted)]" />
                    <p className="text-sm text-[var(--ink-tertiary)]">No hay gastos fijos registrados</p>
                    <Button variant="secondary" size="sm" className="mt-3" onClick={() => openNewExpense('fixed')}>
                      <Plus size={14} /> Agregar primer gasto fijo
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {fixedExpenses.map((exp) => (
                      <ExpenseCard key={exp.id} expense={exp} />
                    ))}
                  </div>
                )}
              </div>
              {fixedTotal > 0 && (
                <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
                  <p className="text-xs text-[var(--ink-tertiary)] uppercase tracking-wide mb-1">Carga fija mensual</p>
                  <p className="text-2xl font-bold text-[var(--ink)]">{formatCurrency(fixedTotal)}</p>
                </div>
              )}
            </div>
          )}

          {/* Gastos Variables */}
          {activeTab === 'variable' && (
            <div className="space-y-3">
              <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">Gastos Variables</p>
                    <p className="text-xs text-[var(--ink-tertiary)]">
                      {variableExpenses.length} concepto{variableExpenses.length !== 1 ? 's' : ''}
                      {variableTotal > 0 && ` · Total: ${formatCurrency(variableTotal)}`}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => openNewExpense('variable')}>
                    <Plus size={14} /> Agregar
                  </Button>
                </div>
                {variableExpenses.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <TrendingDown size={32} className="mx-auto mb-2 text-[var(--ink-muted)]" />
                    <p className="text-sm text-[var(--ink-tertiary)]">No hay gastos variables registrados</p>
                    <Button variant="secondary" size="sm" className="mt-3" onClick={() => openNewExpense('variable')}>
                      <Plus size={14} /> Agregar primer gasto variable
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {variableExpenses.map((exp) => (
                      <ExpenseCard key={exp.id} expense={exp} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Deuda */}
          {activeTab === 'debt' && (
            <div className="space-y-3">
              <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">Deuda</p>
                    <p className="text-xs text-[var(--ink-tertiary)]">{ap.length} deuda{ap.length !== 1 ? 's' : ''}</p>
                  </div>
                  <Button size="sm" onClick={() => setShowApModal(true)}>
                    <Plus size={14} /> Agregar
                  </Button>
                </div>
                {ap.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Building2 size={32} className="mx-auto mb-2 text-[var(--ink-muted)]" />
                    <p className="text-sm text-[var(--ink-tertiary)]">No hay deudas registradas</p>
                    <Button variant="secondary" size="sm" className="mt-3" onClick={() => setShowApModal(true)}>
                      <Plus size={14} /> Agregar deuda
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {ap.map((a) => (
                      <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--surface-2)]/30 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[var(--ink)] truncate">
                            {a.suppliers?.name || 'Proveedor'}
                            {a.installment_number && (
                              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--accent)]/10 text-[var(--accent)]">
                                Cuota {a.installment_number}/{a.total_installments}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-[var(--ink-tertiary)] mt-0.5">
                            {a.description || '—'}
                            {a.due_date && ` · Vence: ${a.due_date.split('T')[0].split('-').reverse().join('/')}`}
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
                            onClick={() => deleteAp(a.id, a.installment_group_id)}
                            className="p-1 text-[var(--ink-tertiary)] hover:text-[var(--danger)] rounded-[var(--radius-sm)] cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Expense Modal */}
      <Modal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        title={editingExpense ? `Editar Gasto ${expenseForm.type === 'fixed' ? 'Fijo' : 'Variable'}` : `Nuevo Gasto ${expenseForm.type === 'fixed' ? 'Fijo' : 'Variable'}`}
      >
        <form onSubmit={handleExpenseSubmit} className="space-y-4">
          <Input
            label="Descripción"
            value={expenseForm.description}
            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
            required
          />
          <Input
            label="Monto"
            type="number"
            min={1}
            value={expenseForm.amount}
            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value === '' ? '' : Number(e.target.value) })}
            required
          />
          <Input
            label="Categoría"
            value={expenseForm.category}
            onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
            placeholder="ej. Arriendo, Servicios, Papelería"
          />
          <Input
            label="Fecha"
            type="date"
            value={expenseForm.expense_date}
            onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Notas</label>
            <textarea
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
              rows={2}
              value={expenseForm.notes}
              onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
              placeholder="Opcional"
            />
          </div>
          {error && (
            <div className="text-sm text-[var(--danger)] bg-[var(--danger-light)] px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--danger)]/20">
              {error}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowExpenseModal(false)}>Cancelar</Button>
            <Button type="submit">{editingExpense ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>

      {/* Debt Modal */}
      <Modal
        isOpen={showApModal}
        onClose={() => setShowApModal(false)}
        title="Agregar Deuda"
      >
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
          <Input label="Monto total" type="number" value={apForm.amount} onChange={(e) => setApForm({ ...apForm, amount: e.target.value === '' ? '' : Number(e.target.value) })} required min={1} />
          <Input label="Descripción" value={apForm.description} onChange={(e) => setApForm({ ...apForm, description: e.target.value })} />
          <Input label="Número de cuotas" type="number" value={apForm.installments} onChange={(e) => setApForm({ ...apForm, installments: Math.max(1, Number(e.target.value)) })} min={1} />
          {apForm.installments > 1 && (
            <div className="text-sm text-[var(--ink-secondary)] bg-[var(--surface-0)] px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)]">
              Valor por cuota: <strong className="text-[var(--ink)]">${(Number(apForm.amount) / apForm.installments).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong>
              {' · '}{apForm.installments} cuotas
            </div>
          )}
          <Input label="Fecha de primera cuota" type="date" value={apForm.due_date} onChange={(e) => setApForm({ ...apForm, due_date: e.target.value })} />
          {apError && (
            <div className="text-sm text-[var(--danger)] bg-[var(--danger-light)] px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--danger)]/20">
              {apError}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowApModal(false)}>Cancelar</Button>
            <Button type="submit">Crear Deuda</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
