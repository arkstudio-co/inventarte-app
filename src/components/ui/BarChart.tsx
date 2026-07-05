'use client'

interface BarItem {
  label: string
  value: number
  color?: string
}

interface BarChartProps {
  data: BarItem[]
  maxBar?: number
  height?: number
  formatValue?: (v: number) => string
}

const defaultColors = [
  'var(--accent)',
  'var(--tint)',
  'var(--success)',
  'var(--warning)',
  'var(--danger)',
  'var(--ink-secondary)',
  'var(--ink-tertiary)',
]

export function BarChart({ data, maxBar = 5, height = 200, formatValue }: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1)
  const visible = data.slice(0, maxBar)

  return (
    <div className="space-y-2">
      {visible.map((item, i) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-xs text-[var(--ink-secondary)] w-24 truncate shrink-0 text-right" title={item.label}>
            {item.label}
          </span>
          <div className="flex-1 h-5 bg-[var(--surface-2)] rounded-[var(--radius-sm)] overflow-hidden">
            <div
              className="h-full rounded-[var(--radius-sm)] transition-all duration-500"
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                backgroundColor: item.color || defaultColors[i % defaultColors.length],
              }}
            />
          </div>
          <span className="text-xs font-medium text-[var(--ink)] w-20 shrink-0 font-mono">
            {formatValue ? formatValue(item.value) : item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
