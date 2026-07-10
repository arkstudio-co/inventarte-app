'use client'

import { useWallet } from '../wallet-context'
import { SectionCard } from '../SectionCard'
import { Button } from '@/components/ui/Button'
import { Building2, Plus, Trash2, CheckCircle } from 'lucide-react'

export default function GastosPage() {
  const {
    expenseTotals, fixedExpenses, variableExpenses,
    fixedExpenseTotals, variableExpenseTotals,
    ap, apTotal, apShowAll, setApShowAll,
    fixedShowAll, setFixedShowAll, variableShowAll, setVariableShowAll,
    setApModalOpen, setAdminModalOpen,
    markApAsPaid, markFixedAsPaid, deleteAp, deleteAdmin, formatCurrency, gastosTotal,
  } = useWallet()

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
          <span className="font-semibold text-[var(--accent)]">{formatCurrency(fixedExpenseTotals)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--ink-secondary)]">Gastos Variables</span>
          <span className="font-semibold text-[var(--warning)]">{formatCurrency(variableExpenseTotals)}</span>
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

      {/* Gastos Fijos detail */}
      {fixedExpenses.length > 0 && (
        <div className="pt-3">
          <p className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wide mb-2">Gastos Fijos</p>
          <div className="divide-y divide-[var(--border-subtle)]">
            {(fixedShowAll ? fixedExpenses : fixedExpenses.slice(0, 2)).map((o: any) => (
              <div key={o.id} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--ink)] truncate">
                    {o.description}
                    <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--accent)]/10 text-[var(--accent)]">
                      Fijo
                    </span>
                  </p>
                  <p className="text-xs text-[var(--ink-tertiary)]">
                    {o.category || '—'} • Recurrente
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className="text-sm font-bold text-[var(--warning)]">{formatCurrency(o.amount)}</p>
                  <button
                    onClick={() => markFixedAsPaid(o.id)}
                    className="p-1 text-[var(--ink-tertiary)] hover:text-[var(--success)] rounded-[var(--radius-sm)] cursor-pointer"
                    title="Marcar como pagado"
                  >
                    <CheckCircle size={14} />
                  </button>
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
          {fixedExpenses.length > 2 && (
            <button
              onClick={() => setFixedShowAll(!fixedShowAll)}
              className="w-full mt-2 py-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] hover:underline cursor-pointer text-center"
            >
              {fixedShowAll ? 'Ver menos' : `Ver más (${fixedExpenses.length - 2})`}
            </button>
          )}
        </div>
      )}

      {/* Gastos Variables detail */}
      {variableExpenses.length > 0 && (
        <div className="pt-3">
          <p className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wide mb-2">Gastos Variables</p>
          <div className="divide-y divide-[var(--border-subtle)]">
            {(variableShowAll ? variableExpenses : variableExpenses.slice(0, 2)).map((o: any) => (
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
          {variableExpenses.length > 2 && (
            <button
              onClick={() => setVariableShowAll(!variableShowAll)}
              className="w-full mt-2 py-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] hover:underline cursor-pointer text-center"
            >
              {variableShowAll ? 'Ver menos' : `Ver más (${variableExpenses.length - 2})`}
            </button>
          )}
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
                  <p className="text-sm font-medium text-[var(--ink)] truncate">
                    {a.suppliers?.name || 'Proveedor'}
                    {a.installment_number && (
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--accent)]/10 text-[var(--accent)]">
                        Cuota {a.installment_number}/{a.total_installments}
                      </span>
                    )}
                  </p>
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
          {ap.length > 2 && (
            <button
              onClick={() => setApShowAll(!apShowAll)}
              className="w-full mt-2 py-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] hover:underline cursor-pointer text-center"
            >
              {apShowAll ? 'Ver menos' : `Ver más (${ap.length - 2})`}
            </button>
          )}
        </div>
      )}

      {fixedExpenses.length === 0 && variableExpenses.length === 0 && ap.length === 0 && (
        <p className="text-sm text-[var(--ink-tertiary)] py-4 text-center">No hay gastos registrados</p>
      )}
    </SectionCard>
  )
}
