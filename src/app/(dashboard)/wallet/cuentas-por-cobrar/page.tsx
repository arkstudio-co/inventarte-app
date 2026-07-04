'use client'

import { useMemo, useState } from 'react'
import { useWallet } from '../wallet-context'
import { SectionCard } from '../SectionCard'
import { User, ChevronDown, ChevronRight, Mail, Phone, Package } from 'lucide-react'

export default function CuentasPorCobrarPage() {
  const { ar, formatCurrency } = useWallet()
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const grouped = useMemo(() => {
    const map: Record<string, { key: string; seller: any; items: any[]; total: number }> = {}
    for (const item of ar) {
      const sellerKey = item.sellers?.id || item.person_name || 'unknown'
      if (!map[sellerKey]) {
        map[sellerKey] = {
          key: sellerKey,
          seller: item.sellers || { name: item.person_name || 'Desconocido', email: item.person_email },
          items: [],
          total: 0,
        }
      }
      map[sellerKey].items.push(item)
      map[sellerKey].total += item.pending_amount || 0
    }
    return Object.values(map)
  }, [ar])

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <SectionCard title="Cuentas por Cobrar" icon={User} iconColor="text-[var(--accent)]">
      {grouped.length === 0 ? (
        <p className="text-sm text-[var(--ink-tertiary)] py-4 text-center">No hay cuentas por cobrar</p>
      ) : (
        <div className="divide-y divide-[var(--border-subtle)]">
          {grouped.map((group) => {
            const isExpanded = expanded[group.key]
            return (
              <div key={group.key}>
                <button
                  onClick={() => toggleExpanded(group.key)}
                  className="w-full py-2.5 flex items-center justify-between gap-2 hover:bg-[var(--surface-2)]/30 transition-colors cursor-pointer text-left"
                >
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    {isExpanded ? <ChevronDown size={14} className="text-[var(--ink-tertiary)] shrink-0" /> : <ChevronRight size={14} className="text-[var(--ink-tertiary)] shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--ink)]">{group.seller.name}</p>
                      <p className="text-xs text-[var(--ink-tertiary)]">
                        {group.items.length} retiro{group.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-[var(--accent)] shrink-0">
                    {formatCurrency(group.total)}
                  </p>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3 pt-1 space-y-2 text-xs text-[var(--ink-secondary)] bg-[var(--surface-0)] rounded-[var(--radius-sm)] mx-1 mb-2">
                    {group.seller.email && <p className="flex items-center gap-1"><Mail size={12} /> {group.seller.email}</p>}
                    {group.seller.phone && <p className="flex items-center gap-1"><Phone size={12} /> {group.seller.phone}</p>}
                    {group.seller.notes && <p><span className="font-medium text-[var(--ink)]">Notas:</span> {group.seller.notes}</p>}

                    <div className="mt-2 space-y-2 border-t border-[var(--border-subtle)] pt-2">
                      {group.items.map((item: any) => (
                        <div key={item.id} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                          <Package size={14} className="mt-0.5 text-[var(--ink-tertiary)]" />
                          <p className="font-medium text-[var(--ink)]">{item.products?.name}</p>
                          <span className="text-[var(--ink-tertiary)]">Cantidad:</span>
                          <span className="text-right text-[var(--ink)]">{item.quantity} und</span>
                          <span className="text-[var(--ink-tertiary)]">Precio unitario:</span>
                          <span className="text-right text-[var(--ink)]">{formatCurrency(item.products?.price || 0)}</span>
                          <span className="text-[var(--ink-tertiary)]">Fecha:</span>
                          <span className="text-right text-[var(--ink)]">{new Date(item.withdrawal_date).toLocaleDateString('es-CO')}</span>
                          <span className="text-[var(--ink-tertiary)]">Pendiente:</span>
                          <span className="text-right font-semibold text-[var(--accent)]">{formatCurrency(item.pending_amount)}</span>
                          {item.observations && (
                            <>
                              <span className="text-[var(--ink-tertiary)]">Observaciones:</span>
                              <span className="text-right text-[var(--ink)]">{item.observations}</span>
                            </>
                          )}
                        </div>
                      ))}
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
