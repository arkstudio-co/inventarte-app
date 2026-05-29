'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import { useAuth } from '@/providers/AuthProvider'
import { usePermissions } from '@/hooks/usePermissions'
import {
  LayoutDashboard,
  Package,
  Users,
  Settings,
  Palette,
  LogOut,
  X,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'view_dashboard' },
  { href: '/inventory', label: 'Inventario', icon: Package, permission: 'view_inventory' },
  { href: '/users', label: 'Usuarios', icon: Users, permission: 'manage_users' },
  { href: '/landing-admin', label: 'Landing Admin', icon: Palette, permission: 'manage_landing' },
  { href: '/settings', label: 'Configuración', icon: Settings, permission: null },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { signOut, user, profile } = useAuth()
  const { hasPermission } = usePermissions()

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
            <Link href="/dashboard" className="flex items-center gap-2">
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
              if (item.permission && !hasPermission(item.permission)) return null
              const isActive = pathname.startsWith(item.href)
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
              onClick={signOut}
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
