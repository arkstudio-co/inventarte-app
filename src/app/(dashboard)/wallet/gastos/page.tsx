'use client'

import { useWallet } from '../wallet-context'
import { SectionCard } from '../SectionCard'
import { Button } from '@/components/ui/Button'
import { Building2, Plus, Edit, Trash2, CheckCircle, CheckCheck } from 'lucide-react'

export default function GastosPage() {
  const {
    expenseTotals, fixedExpenses, variableExpenses,
    fixedExpenseTotals, paidFixedExpenseTotals, periodStart, periodEnd, variableExpenseTotals,
    fixedShowAll, setFixedShowAll, variableShowAll, setVariableShowAll,
    setAdminModalOpen, setAdminForm, setEditingAdminId, openEditAdmin,
    markFixedAsPaid, deleteAdmin, formatCurrency,
  } = useWallet()

  const openNewExpense = (type: 'fixed' | 'variable') => {
    setEditingAdminId(null)
    setAdminForm({ description: '', amount: '', category: '', type, expense_date: '', notes: '' })
    setAdminModalOpen(true)
  }

  const isPaidInPeriod = (expense: any) =>
    expense.last_paid_date && periodStart && new Date(expense.last_paid_date) >= periodStart

  const isFuturePeriod = periodStart && new Date(periodStart) > new Date()
  const pendingFixedTotals = fixedExpenseTotals - paidFixedExpenseTotals

  return (
    <SectionCard
      title="Gastos"
      icon={Building2}
      iconColor="text-[var(--warning)]"
    >
      {/* Summary rows */}
      <div className="space-y-1 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--ink-secondary)]">Gastos Operativos (Inventario)</span>
          <span className="font-semibold text-[var(--danger)]">{formatCurrency(expenseTotals)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--ink-secondary)]">Gastos Fijos</span>
          <span className="font-semibold text-[var(--accent)]">{formatCurrency(paidFixedExpenseTotals)}</span>
          <span className="text-xs text-[var(--success)] ml-1">({formatCurrency(pendingFixedTotals)} pend.)</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--ink-secondary)]">Gastos Variables</span>
          <span className="font-semibold text-[var(--warning)]">{formatCurrency(variableExpenseTotals)}</span>
        </div>
      </div>

      {/* Gastos Fijos section */}
      <div className="pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wide">Gastos Fijos</p>
          <Button size="sm" variant="secondary" onClick={() => openNewExpense('fixed')}>
            <Plus size={14} /> Agregar
          </Button>
        </div>
        {fixedExpenses.length > 0 ? (
          <>
            <div className="divide-y divide-[var(--border-subtle)]">
              {(fixedShowAll ? fixedExpenses : fixedExpenses.slice(0, 3)).map((o: any) => (
                <div key={o.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--ink)] truncate">
                      {o.description}
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--accent)]/10 text-[var(--accent)]">
                        Fijo
                      </span>
                      {isPaidInPeriod(o) ? (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--success)]/10 text-[var(--success)]">
                          <CheckCheck size={12} className="mr-0.5" /> Pagado
                        </span>
                      ) : (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--warning)]/10 text-[var(--warning)]">
                          Pendiente
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--ink-tertiary)]">
                      {o.category || '—'} • Recurrente
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-sm font-bold text-[var(--warning)]">{formatCurrency(o.amount)}</p>
                    <button
                      onClick={() => openEditAdmin(o)}
                      className="p-1 text-[var(--ink-tertiary)] hover:text-[var(--tint)] rounded-[var(--radius-sm)] cursor-pointer"
                      title="Editar"
                    >
                      <Edit size={14} />
                    </button>
                    {isPaidInPeriod(o) ? (
                      <span className="p-1 text-[var(--success)]" title="Pagado">
                        <CheckCheck size={14} />
                      </span>
                    ) : (
                      <button
                        onClick={() => markFixedAsPaid(o.id)}
                        className="p-1 text-[var(--ink-tertiary)] hover:text-[var(--success)] rounded-[var(--radius-sm)] cursor-pointer"
                        title="Marcar como pagado"
                      >
                        <CheckCircle size={14} />
                      </button>
                    )}
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
            {fixedExpenses.length > 3 && (
              <button
                onClick={() => setFixedShowAll(!fixedShowAll)}
                className="w-full mt-2 py-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] hover:underline cursor-pointer text-center"
              >
                {fixedShowAll ? 'Ver menos' : `Ver más (${fixedExpenses.length - 3})`}
              </button>
            )}
          </>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm text-[var(--ink-tertiary)] mb-2">No hay gastos fijos</p>
            <Button variant="secondary" size="sm" onClick={() => openNewExpense('fixed')}>
              <Plus size={14} /> Agregar primer gasto fijo
            </Button>
          </div>
        )}
      </div>

      {/* Gastos Variables section */}
      <div className="pt-3 border-t border-[var(--border-subtle)] mt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wide">Gastos Variables</p>
          {!isFuturePeriod && (
            <Button size="sm" variant="secondary" onClick={() => openNewExpense('variable')}>
              <Plus size={14} /> Agregar
            </Button>
          )}
        </div>
        {variableExpenses.length > 0 ? (
          <>
            <div className="divide-y divide-[var(--border-subtle)]">
              {(variableShowAll ? variableExpenses : variableExpenses.slice(0, 3)).map((o: any) => (
                <div key={o.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--ink)] truncate">
                      {o.description}
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
            {variableExpenses.length > 3 && (
              <button
                onClick={() => setVariableShowAll(!variableShowAll)}
                className="w-full mt-2 py-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] hover:underline cursor-pointer text-center"
              >
                {variableShowAll ? 'Ver menos' : `Ver más (${variableExpenses.length - 3})`}
              </button>
            )}
          </>
        ) : (
          <div className="py-4 text-center">
            <p className="text-sm text-[var(--ink-tertiary)] mb-2">No hay gastos variables</p>
            {!isFuturePeriod && (
              <Button variant="secondary" size="sm" onClick={() => openNewExpense('variable')}>
                <Plus size={14} /> Agregar primer gasto variable
              </Button>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  )
}
