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
          'w-full px-3.5 py-2.5 text-sm rounded-[var(--radius-md)]',
          'bg-[var(--surface)] text-[var(--ink)]',
          'border border-[var(--border)]',
          'placeholder:text-[var(--ink-muted)]',
          'hover:border-[var(--border-strong)]',
          'focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(26,95,122,0.12)]',
          'transition-all duration-200',
          error && 'border-[var(--danger)] focus:border-[var(--danger)] focus:shadow-[0_0_0_3px_rgba(196,64,64,0.12)]',
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
