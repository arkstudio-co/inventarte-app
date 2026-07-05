'use client'

interface DonutSegment {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  segments: DonutSegment[]
  size?: number
  strokeWidth?: number
  formatValue?: (v: number) => string
}

export function DonutChart({ segments, size = 160, strokeWidth = 28, formatValue }: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  let currentOffset = 0

  const arcs = segments.map((seg) => {
    const segmentFraction = seg.value / total
    const segmentLength = segmentFraction * circumference
    const arc = (
      <circle
        key={seg.label}
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={seg.color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
        strokeDashoffset={-currentOffset}
        transform={`rotate(-90 ${center} ${center})`}
        className="transition-all duration-500"
      />
    )
    currentOffset += segmentLength
    return arc
  })

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} className="shrink-0">
        {arcs}
      </svg>
      <div className="flex flex-wrap justify-center gap-3">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: seg.color }}
            />
            <span className="text-xs text-[var(--ink-secondary)]">{seg.label}</span>
            <span className="text-xs font-medium text-[var(--ink)] font-mono">
              {formatValue ? formatValue(seg.value) : seg.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
