'use client'

import { cn } from '@/lib/utils/cn'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({ label, error, className, id, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-[var(--ink-secondary)]">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'w-full px-3 py-2 text-sm rounded-[var(--radius-sm)]',
          'bg-[var(--surface-1)] text-[var(--ink)]',
          'border border-[var(--border-default)]',
          'placeholder:text-[var(--ink-muted)]',
          'hover:border-[var(--border-strong)]',
          'focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--border-focus)]',
          'transition-colors duration-150',
          error && 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-red-200',
          className
        )}
        {...props}
      />
      {error && (
        <span className="text-xs text-[var(--danger)]">{error}</span>
      )}
    </div>
  )
}
