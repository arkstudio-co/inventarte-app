'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { useAuth } from '@/providers/AuthProvider'
import {
  Wallet,
  UserCheck,
  Palette,
  LogOut,
  X,
  Box,
  ArrowUpDown,
  Receipt,
  Users,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  FileText,
  LayoutDashboard,
  Package,
  Scale,
  Building2,
} from 'lucide-react'

interface SubNavItem {
  href: string
  label: string
  icon?: React.ComponentType<{ size?: number }>
}

const walletSubItems: SubNavItem[] = [
  { href: '/wallet/ingresos', label: 'Ingresos' },
  { href: '/wallet/cuentas-por-cobrar', label: 'Cuentas por Cobrar' },
  { href: '/wallet/gastos', label: 'Gastos' },
]

const inventorySubItems: SubNavItem[] = [
  { href: '/inventory', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inventory/movements', label: 'Movimientos', icon: TrendingUp },
  { href: '/inventory/purchase-orders', label: 'Órdenes de Compra', icon: Package },
  { href: '/inventory/adjustments', label: 'Ajustes', icon: Scale },
  { href: '/inventory/reports', label: 'Reportes', icon: FileText },
]

const navItems = [
  {
    type: 'group' as const,
    label: 'Wallet',
    icon: Wallet,
    href: '/wallet',
    children: walletSubItems,
  },
  { type: 'link' as const, href: '/products', label: 'Productos', icon: Box },
  {
    type: 'group' as const,
    label: 'Inventario',
    icon: ArrowUpDown,
    href: '/inventory',
    children: inventorySubItems,
  },
  { type: 'link' as const, href: '/settings', label: 'Concepto de Gastos', icon: Receipt },
  { type: 'link' as const, href: '/users', label: 'Usuarios', icon: Users },
  {
    type: 'group' as const,
    label: 'Equipo',
    icon: Users,
    href: '/colaboradores',
    children: [
      { href: '/colaboradores', label: 'Vendedores', icon: UserCheck },
      { href: '/colaboradores/proveedores', label: 'Proveedores', icon: Building2 },
    ],
  },
  { type: 'link' as const, href: '/landing-admin', label: 'Landing Admin', icon: Palette },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { signOut, user, profile } = useAuth()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    Wallet: true,
    Inventario: true,
    Equipo: true,
  })

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-64',
          'bg-[var(--surface-0)] border-r border-[var(--border-default)]',
          'transform transition-transform duration-200 ease-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full p-4">
          <div className="flex items-center justify-between mb-8">
            <Link href="/wallet" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--tint)] flex items-center justify-center">
                <span className="text-sm font-bold text-[var(--ink)]">D</span>
              </div>
              <span className="font-semibold text-[var(--ink)]">Dibujarte</span>
            </Link>
            <button onClick={onClose} className="lg:hidden p-1 text-[var(--ink-tertiary)] hover:text-[var(--ink)] cursor-pointer">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              if (item.type === 'group') {
                const isGroupActive = pathname === item.href || pathname.startsWith(item.href + '/')
                const isOpen = openGroups[item.label] ?? true
                return (
                  <div key={item.label}>
                    <Link
                      href={item.href}
                      onClick={(e) => {
                        if (pathname.startsWith(item.href)) {
                          e.preventDefault()
                          toggleGroup(item.label)
                        } else {
                          onClose()
                        }
                      }}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 text-sm rounded-[var(--radius-sm)] transition-colors',
                        'border border-transparent w-full',
                        isGroupActive
                          ? 'bg-[var(--tint-light)] text-[var(--ink)] font-medium border-[var(--tint)]/30'
                          : 'text-[var(--ink-secondary)] hover:bg-[var(--surface-1)] hover:border-[var(--border-subtle)]'
                      )}
                    >
                      <item.icon size={18} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </Link>
                    {isOpen && (
                      <div className="ml-3 mt-0.5 space-y-0.5 border-l border-[var(--border-subtle)] pl-2">
                        {item.children.map((sub) => {
                          const isSubActive = pathname === sub.href
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={onClose}
                              className={cn(
                                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-[var(--radius-sm)] transition-colors',
                                'border border-transparent',
                                isSubActive
                                  ? 'bg-[var(--tint-light)] text-[var(--ink)] font-medium border-[var(--tint)]/30'
                                  : 'text-[var(--ink-tertiary)] hover:bg-[var(--surface-1)] hover:text-[var(--ink-secondary)]'
                              )}
                            >
                              {sub.icon && <sub.icon size={14} />}
                              {sub.label}
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 text-sm rounded-[var(--radius-sm)] transition-colors',
                    'border border-transparent',
                    isActive
                      ? 'bg-[var(--tint-light)] text-[var(--ink)] font-medium border-[var(--tint)]/30'
                      : 'text-[var(--ink-secondary)] hover:bg-[var(--surface-1)] hover:border-[var(--border-subtle)]'
                  )}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
            <div className="px-3 py-2">
              <p className="text-sm font-medium text-[var(--ink)] truncate">{profile?.full_name || user?.email}</p>
              <p className="text-xs text-[var(--ink-tertiary)] capitalize">{profile?.role}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm text-[var(--ink-secondary)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] rounded-[var(--radius-sm)] transition-colors cursor-pointer border border-transparent hover:border-[var(--danger)]/20"
            >
              <LogOut size={18} />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
