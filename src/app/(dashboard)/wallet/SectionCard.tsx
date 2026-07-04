import type { ReactNode } from 'react'

export function SectionCard({ title, icon: Icon, iconColor, children, action }: {
  title: string
  icon: any
  iconColor: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={18} className={iconColor} />
          <h3 className="text-sm font-semibold text-[var(--ink)]">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
