import { cn } from '@/lib/utils/cn'
import type { ReactNode } from 'react'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}

const variantClasses = {
  default: 'bg-[var(--surface-1)] text-[var(--ink-secondary)] border-[var(--border-default)]',
  success: 'bg-[var(--success-light)] text-[var(--success)] border-[var(--success)]/30',
  warning: 'bg-[var(--warning-light)] text-[var(--warning)] border-[var(--warning)]/30',
  danger: 'bg-[var(--danger-light)] text-[var(--danger)] border-[var(--danger)]/30',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-[var(--radius-sm)]',
        'border',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
