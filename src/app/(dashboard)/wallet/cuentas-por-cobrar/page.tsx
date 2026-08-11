'use client'

import { useState } from 'react'
import { useWallet } from '../wallet-context'
import { SectionCard } from '../SectionCard'
import { User, ChevronDown, ChevronRight, Mail, Phone } from 'lucide-react'

export default function CuentasPorCobrarPage() {
  const { ar, formatCurrency } = useWallet()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <SectionCard title="Cuentas por Cobrar" icon={User} iconColor="text-[var(--accent)]">
      {ar.length === 0 ? (
        <p className="text-sm text-[var(--ink-tertiary)] py-4 text-center">No hay cuentas por cobrar</p>
      ) : (
        <div className="divide-y divide-[var(--border-subtle)]">
          {ar.map((group) => {
            const first = group.items[0]
            const key = group.seller?.id || first?.seller_id || `s-${first?.id}`
            const isExpanded = expanded[key]
            return (
              <div key={key}>
                <button
                  onClick={() => toggleExpanded(key)}
                  className="w-full py-2.5 flex items-center justify-between gap-2 hover:bg-[var(--surface-2)]/30 transition-colors cursor-pointer text-left"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    {isExpanded ? <ChevronDown size={14} className="text-[var(--ink-tertiary)] shrink-0" /> : <ChevronRight size={14} className="text-[var(--ink-tertiary)] shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--ink)]">{group.seller?.name || 'Vendedor'}</p>
                      <p className="text-xs text-[var(--ink-tertiary)]">
                        {group.items.length} venta{group.items.length !== 1 ? 's' : ''} por cobrar
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-[var(--accent)] shrink-0">
                    {formatCurrency(group.netDue)}
                  </p>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3 pt-1 space-y-2 text-xs text-[var(--ink-secondary)] bg-[var(--surface-0)] rounded-[var(--radius-sm)] mx-1 mb-2">
                    {group.seller?.email && <p className="flex items-center gap-1"><Mail size={12} /> {group.seller.email}</p>}
                    {group.seller?.phone && <p className="flex items-center gap-1"><Phone size={12} /> {group.seller.phone}</p>}

                    <div className="mt-1 space-y-2">
                      {group.items.map((rem: any) => (
                        <div key={rem.id} className="border border-[var(--border-subtle)] rounded-[var(--radius-sm)] p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-[var(--ink)]">{rem.remision_number}</p>
                            <span className="text-[var(--ink-tertiary)]">
                              {new Date(rem.created_at).toLocaleDateString('es-CO')}
                            </span>
                          </div>
                          {(rem.remision_items || []).map((item: any) => (
                            <div key={item.id} className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center">
                              <span className="text-[var(--ink)] truncate">
                                {item.product_name} <span className="text-[var(--ink-tertiary)]">x{item.quantity}</span>
                              </span>
                              <span className="text-[var(--ink-tertiary)]">@ {formatCurrency(item.unit_price)}</span>
                              <span className="text-right font-medium text-[var(--ink)]">{formatCurrency(item.subtotal)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between border-t border-[var(--border-subtle)] pt-1.5">
                            <span className="text-[var(--ink-tertiary)]">Total remisión</span>
                            <span className="font-semibold text-[var(--ink)]">{formatCurrency(rem.total_amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {(group.paymentsTotal > 0 || group.returnsTotal > 0) && (
                      <div className="grid grid-cols-2 gap-2 text-[var(--ink-secondary)]">
                        {group.paymentsTotal > 0 && (
                          <span>Abonos: <strong className="text-[var(--success)]">-{formatCurrency(group.paymentsTotal)}</strong></span>
                        )}
                        {group.returnsTotal > 0 && (
                          <span>Devoluciones: <strong className="text-[var(--success)]">-{formatCurrency(group.returnsTotal)}</strong></span>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between border-t border-[var(--border-subtle)] pt-1.5">
                      <span className="text-[var(--ink-secondary)]">Pendiente neto</span>
                      <span className="font-semibold text-[var(--accent)]">{formatCurrency(group.netDue)}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}