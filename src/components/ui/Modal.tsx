'use client'

import { cn } from '@/lib/utils/cn'
import type { ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative w-full max-w-lg rounded-[var(--radius-lg)]',
          'bg-[var(--surface-overlay)]',
          'border border-[var(--border-default)]',
          'shadow-lg',
          'p-6',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-[var(--border-subtle)]">
            <h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-[var(--radius-sm)] text-[var(--ink-tertiary)] hover:text-[var(--ink)] hover:bg-[var(--surface-1)] transition-colors cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
