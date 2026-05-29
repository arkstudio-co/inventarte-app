'use client'

import { useState } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { cn } from '@/lib/utils/cn'
import { Bell, Menu } from 'lucide-react'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { lowStockProducts, unreadCount } = useNotifications()
  const [showNotifications, setShowNotifications] = useState(false)

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
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
            <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-[var(--radius-md)] bg-[var(--surface-overlay)] border border-[var(--border-default)] shadow-lg">
              <div className="p-3 border-b border-[var(--border-subtle)]">
                <h3 className="text-sm font-semibold text-[var(--ink)]">Notificaciones</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {lowStockProducts.length === 0 ? (
                  <div className="p-4 text-sm text-[var(--ink-tertiary)] text-center">
                    No hay notificaciones
                  </div>
                ) : (
                  lowStockProducts.map((p) => (
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
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
