'use client'

import { useWallet } from '../wallet-context'
import { SectionCard } from '../SectionCard'
import { Button } from '@/components/ui/Button'
import { TrendingUp, Plus, Trash2 } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  donation: 'Donación',
  sponsorship: 'Patrocinio',
  service: 'Servicio',
  interest: 'Interés',
  other: 'Otro',
}

export default function IngresosPage() {
  const {
    income, paymentsTotal, otherIncome, incomeTotals, otherIncomeTotals,
    setOtherIncomeModalOpen,
    deleteOtherIncome, formatCurrency,
  } = useWallet()

  return (
    <SectionCard
      title="Ingresos"
      icon={TrendingUp}
      iconColor="text-[var(--success)]"
      action={
        <Button size="sm" onClick={() => setOtherIncomeModalOpen(true)}>
          <Plus size={14} /> Otro Ingreso
        </Button>
      }
    >
      {income.length === 0 && paymentsTotal === 0 && otherIncome.length === 0 ? (
        <p className="text-sm text-[var(--ink-tertiary)] py-4 text-center">No hay ingresos registrados</p>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-[var(--ink-secondary)]">Ventas de contado</span>
            <span className="font-semibold text-[var(--success)]">{formatCurrency(incomeTotals)}</span>
          </div>
          {income.length > 0 && (
            <div className="border-t border-[var(--border-subtle)] pt-2 space-y-2">
              {income.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--ink)] truncate">
                      {v.remision_number}{v.sellers?.name ? ` · ${v.sellers.name}` : ''}
                    </p>
                    <p className="text-xs text-[var(--ink-tertiary)]">
                      {new Date(v.created_at).toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[var(--success)] shrink-0 ml-2">{formatCurrency(v.total_amount)}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-[var(--ink-secondary)]">Abonos de vendedores</span>
            <span className="font-semibold text-[var(--success)]">{formatCurrency(paymentsTotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--ink-secondary)]">Otros Ingresos</span>
            <span className="font-semibold text-[var(--success)]">{formatCurrency(otherIncomeTotals)}</span>
          </div>
          {otherIncome.length > 0 && (
            <>
              <div className="border-t border-[var(--border-subtle)] pt-2">
                <div className="space-y-2">
                  {otherIncome.map((o) => (
                    <div key={o.id} className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-[var(--ink)] truncate">{o.description}</p>
                        <p className="text-xs text-[var(--ink-tertiary)]">
                          {CATEGORY_LABELS[o.category] || o.category} &middot; {new Date(o.income_date).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-sm font-semibold text-[var(--success)]">{formatCurrency(o.amount)}</span>
                        <button
                          onClick={() => deleteOtherIncome(o.id)}
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
            </>
          )}
          <div className="flex items-center justify-between font-semibold pt-2 border-t border-[var(--border-subtle)]">
            <span className="text-[var(--ink)]">Total Ingresos</span>
            <span className="text-[var(--success)]">{formatCurrency(incomeTotals + paymentsTotal + otherIncomeTotals)}</span>
          </div>
          {(() => {
            const totalIngresos = incomeTotals + paymentsTotal + otherIncomeTotals
            if (totalIngresos <= 0) return null
            const ventasPct = (incomeTotals / totalIngresos) * 100
            const abonosPct = (paymentsTotal / totalIngresos) * 100
            const otrosPct = (otherIncomeTotals / totalIngresos) * 100
            const segments = [
              { pct: ventasPct, cls: 'bg-[var(--success)]' },
              { pct: abonosPct, cls: 'bg-[var(--accent)]' },
              { pct: otrosPct, cls: 'bg-[var(--warning)]' },
            ].filter((s) => s.pct > 0)
            return (
              <div className="space-y-1.5 pt-1">
                <div className="flex h-2 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  {segments.map((s, i) => (
                    <div
                      key={s.cls}
                      className={`${s.cls} transition-all ${i === 0 ? 'rounded-l-full' : ''} ${i === segments.length - 1 ? 'rounded-r-full' : ''}`}
                      style={{ width: `${s.pct}%` }}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[var(--ink-tertiary)]">
                  {ventasPct > 0 && <span>Ventas {ventasPct.toFixed(0)}%</span>}
                  {abonosPct > 0 && <span>Abonos {abonosPct.toFixed(0)}%</span>}
                  {otrosPct > 0 && <span>Otros Ingresos {otrosPct.toFixed(0)}%</span>}
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </SectionCard>
  )
}
