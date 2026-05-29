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
  primary: 'bg-[var(--tint)] text-[var(--ink)] hover:bg-[var(--tint-hover)] border border-[var(--border-default)]',
  secondary: 'bg-[var(--surface-1)] text-[var(--ink)] hover:bg-[var(--surface-2)] border border-[var(--border-default)]',
  ghost: 'bg-transparent text-[var(--ink-secondary)] hover:bg-[var(--surface-1)] border border-transparent hover:border-[var(--border-subtle)]',
  danger: 'bg-[var(--danger)] text-white hover:opacity-90 border border-[var(--border-default)]',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
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
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-[var(--border-focus)]',
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
