'use client'

import { useWallet } from '../wallet-context'
import { SectionCard } from '../SectionCard'
import { Button } from '@/components/ui/Button'
import { Building2, Plus, CheckCircle, Trash2 } from 'lucide-react'

export default function DeudaPage() {
  const {
    ap, apTotal, apShowAll, setApShowAll,
    setApModalOpen,
    markApAsPaid, deleteAp, formatCurrency,
  } = useWallet()

  return (
    <SectionCard
      title="Deuda"
      icon={Building2}
      iconColor="text-[var(--warning)]"
      action={
        <Button size="sm" onClick={() => setApModalOpen(true)}>
          <Plus size={14} /> Agregar Deuda
        </Button>
      }
    >
      {ap.length === 0 ? (
        <p className="text-sm text-[var(--ink-tertiary)] py-4 text-center">No hay deudas registradas</p>
      ) : (
        <>
          {/* Summary */}
          <div className="flex items-center justify-between text-sm pb-3 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--ink-secondary)]">Total Deuda</span>
            <span className="font-semibold text-[var(--warning)]">{formatCurrency(apTotal)}</span>
          </div>

          {/* Detail list */}
          <div className="pt-3 divide-y divide-[var(--border-subtle)]">
            {(apShowAll ? ap : ap.slice(0, 5)).map((a) => (
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
          {ap.length > 5 && (
            <button
              onClick={() => setApShowAll(!apShowAll)}
              className="w-full mt-2 py-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] hover:underline cursor-pointer text-center"
            >
              {apShowAll ? 'Ver menos' : `Ver más (${ap.length - 5})`}
            </button>
          )}
        </>
      )}
    </SectionCard>
  )
}
