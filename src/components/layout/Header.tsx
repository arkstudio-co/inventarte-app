'use client'

import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils/cn'
import { Bell, Menu } from 'lucide-react'
import type { AccountPayable } from '@/types/database'

interface HeaderProps {
  onMenuClick: () => void
}

function formatCurrency(n: number) {
  return '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function daysUntil(dateStr: string): string {
  const due = new Date(dateStr)
  const now = new Date()
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'Vencida'
  if (diff === 0) return 'Vence hoy'
  if (diff === 1) return 'Vence mañana'
  return `Vence en ${diff} días`
}

export function Header({ onMenuClick }: HeaderProps) {
  const { lowStockProducts, dueDebts, unreadCount } = useNotifications()
  const [showNotifications, setShowNotifications] = useState(false)

  const hasAny = lowStockProducts.length > 0 || dueDebts.length > 0

  return (
    <header className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-[var(--border-default)] bg-[var(--surface-0)]">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:bg-[var(--surface-1)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1" />

      <div className="relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:bg-[var(--surface-1)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[var(--danger)] text-white text-[10px] font-bold flex items-center justify-center rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <>
            <div className="fixed inset-0 z-40 bg-black/10" onClick={() => setShowNotifications(false)} />
            <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border-default)] shadow-lg">
              <div className="p-3 border-b border-[var(--border-subtle)]">
                <h3 className="text-sm font-semibold text-[var(--ink)]">Notificaciones</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {!hasAny ? (
                  <div className="p-4 text-sm text-[var(--ink-tertiary)] text-center">
                    No hay notificaciones
                  </div>
                ) : (
                  <>
                    {lowStockProducts.map((p) => (
                      <div key={p.id} className="p-3 border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-1)]">
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 mt-1.5 rounded-full bg-[var(--danger)] shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-[var(--ink)]">{p.name}</p>
                            <p className="text-xs text-[var(--ink-tertiary)]">
                              Stock: <span className="text-[var(--danger)] font-medium">{p.stock}</span> / Mínimo: {p.min_stock}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {dueDebts.map((d) => (
                      <div key={d.id} className="p-3 border-b border-[var(--border-subtle)] last:border-b-0 hover:bg-[var(--surface-1)]">
                        <div className="flex items-start gap-2">
                          <span className="w-2 h-2 mt-1.5 rounded-full bg-[var(--warning)] shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-[var(--ink)]">{d.suppliers?.name || d.description || 'Deuda'}</p>
                            <p className="text-xs text-[var(--ink-tertiary)]">
                              {formatCurrency(d.amount)} · <span className="text-[var(--warning)] font-medium">{daysUntil(d.due_date!)}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
