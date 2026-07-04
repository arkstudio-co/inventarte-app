'use client'

import { useWallet } from '../wallet-context'
import { SectionCard } from '../SectionCard'
import { Button } from '@/components/ui/Button'
import { TrendingUp, Plus, Trash2 } from 'lucide-react'

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
            <span className="text-[var(--ink-secondary)]">Ventas directas</span>
            <span className="font-semibold text-[var(--success)]">{formatCurrency(incomeTotals)}</span>
          </div>
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
                          {o.category} &middot; {new Date(o.income_date).toLocaleDateString('es-CO')}
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
  )
}
