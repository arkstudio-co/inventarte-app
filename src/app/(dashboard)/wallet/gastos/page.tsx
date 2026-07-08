'use client'

import { useWallet } from '../wallet-context'
import { SectionCard } from '../SectionCard'
import { Button } from '@/components/ui/Button'
import { Building2, Plus, Trash2, CheckCircle } from 'lucide-react'

export default function GastosPage() {
  const {
    expenseTotals, adminExpenses, adminExpenseTotals,
    ap, apTotal, apShowAll, setApShowAll, adminShowAll, setAdminShowAll,
    setApModalOpen, setAdminModalOpen,
    markApAsPaid, deleteAp, deleteAdmin, formatCurrency, gastosTotal,
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
            {(adminShowAll ? adminExpenses : adminExpenses.slice(0, 2)).map((o: any) => (
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
                    {o.category || '—'} • {o.type === 'fixed' ? 'Recurrente' : (o.expense_date ? new Date(o.expense_date).toLocaleDateString('es-CO') : '—')}
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
  )
}
