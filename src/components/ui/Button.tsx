'use client'

import { cn } from '@/lib/utils/cn'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)]',
  secondary:
    'bg-transparent text-[var(--primary)] border border-[var(--primary)] hover:bg-[var(--primary-light)]',
  ghost:
    'bg-transparent text-[var(--ink-secondary)] hover:bg-[var(--surface-muted)]',
  danger:
    'bg-[var(--danger)] text-white hover:opacity-90',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] font-medium transition-all duration-200',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'cursor-pointer select-none',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
