'use client'

import { CalendarDays } from 'lucide-react'

export type FilterMode = 'month' | 'today' | 'yesterday' | 'last30' | 'last15' | 'last7' | 'custom' | 'all'

export interface DateFilterState {
  mode: FilterMode
  month: number
  year: number
  customStart: string
  customEnd: string
}

interface DateFilterProps {
  value: DateFilterState
  onChange: (value: DateFilterState) => void
}

const MONTHS = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => ({
  value: String(2020 + i),
  label: String(2020 + i),
}))

export function computeDateRange(filter: DateFilterState): { startDate: Date | null; endDate: Date | null } {
  const now = new Date()
  let startDate: Date | null = null
  let endDate: Date | null = null

  switch (filter.mode) {
    case 'month':
      if (filter.month === 0) {
        startDate = new Date(filter.year, 0, 1)
        endDate = new Date(filter.year + 1, 0, 1)
      } else {
        startDate = new Date(filter.year, filter.month - 1, 1)
        endDate = new Date(filter.year, filter.month, 1)
      }
      break
    case 'today': {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      startDate = todayStart
      const tomorrow = new Date(todayStart)
      tomorrow.setDate(tomorrow.getDate() + 1)
      endDate = tomorrow
      break
    }
    case 'yesterday': {
      const yesterdayStart = new Date()
      yesterdayStart.setDate(yesterdayStart.getDate() - 1)
      yesterdayStart.setHours(0, 0, 0, 0)
      startDate = yesterdayStart
      const todayMidnight = new Date()
      todayMidnight.setHours(0, 0, 0, 0)
      endDate = todayMidnight
      break
    }
    case 'last30':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      endDate = now
      break
    case 'last15':
      startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
      endDate = now
      break
    case 'last7':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      endDate = now
      break
    case 'custom':
      if (filter.customStart && filter.customEnd) {
        startDate = new Date(filter.customStart + 'T00:00:00')
        const end = new Date(filter.customEnd)
        end.setDate(end.getDate() + 1)
        endDate = end
      }
      break
  }

  return { startDate, endDate }
}

export function DateFilter({ value, onChange }: DateFilterProps) {
  const now = new Date()
  const isDefault =
    value.mode === 'month' &&
    value.month === now.getMonth() + 1 &&
    value.year === now.getFullYear()

  const showDateInputs =
    value.mode === 'custom' ||
    value.mode === 'last30' ||
    value.mode === 'last15' ||
    value.mode === 'last7' ||
    value.mode === 'today' ||
    value.mode === 'yesterday'

  const showPersonalized = value.mode === 'month' && !isDefault

  const handleModeChange = (next: string) => {
    if (next === 'personalized') return
    const mode = next as FilterMode
    const d = new Date()
    let customStart = value.customStart
    let customEnd = value.customEnd
    let month = value.month
    let year = value.year

    switch (mode) {
      case 'custom':
        customEnd = d.toISOString().split('T')[0]
        customStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
        break
      case 'last30':
      case 'last15':
      case 'last7': {
        const days = mode === 'last30' ? 30 : mode === 'last15' ? 15 : 7
        const start = new Date(d.getTime() - days * 24 * 60 * 60 * 1000)
        customEnd = d.toISOString().split('T')[0]
        customStart = start.toISOString().split('T')[0]
        break
      }
      case 'today': {
        const today = d.toISOString().split('T')[0]
        customStart = today
        customEnd = today
        break
      }
      case 'yesterday': {
        const today = d.toISOString().split('T')[0]
        const yesterday = new Date(d)
        yesterday.setDate(yesterday.getDate() - 1)
        customStart = yesterday.toISOString().split('T')[0]
        customEnd = today
        break
      }
      case 'month':
        month = d.getMonth() + 1
        year = d.getFullYear()
        break
    }

    onChange({ mode, month, year, customStart, customEnd })
  }

  const handleStartChange = (val: string) => {
    onChange({
      ...value,
      customStart: val,
      mode: value.mode !== 'custom' ? 'custom' : value.mode,
    })
  }

  const handleEndChange = (val: string) => {
    onChange({
      ...value,
      customEnd: val,
      mode: value.mode !== 'custom' ? 'custom' : value.mode,
    })
  }

  return (
    <div className="flex items-center gap-2">
      <CalendarDays size={16} className="text-[var(--ink-tertiary)] shrink-0" />
      <select
        value={showPersonalized ? 'personalized' : value.mode}
        onChange={(e) => handleModeChange(e.target.value)}
        className="px-2.5 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-1)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer"
      >
        <option value="month">Este mes</option>
        {showPersonalized && (
          <option value="personalized" disabled>
            Personalizado
          </option>
        )}
        <option value="today">Hoy</option>
        <option value="yesterday">Ayer</option>
        <option value="last7">Últimos 7 días</option>
        <option value="last15">Últimos 15 días</option>
        <option value="last30">Últimos 30 días</option>
        <option value="custom">Personalizar</option>
        <option value="all">Todo el período</option>
      </select>

      {value.mode === 'month' && (
        <>
          <select
            value={value.month}
            onChange={(e) => onChange({ ...value, month: Number(e.target.value) })}
            className="px-2.5 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-1)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer"
          >
            <option value="0">Todos los meses</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={value.year}
            onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
            className="px-2.5 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-1)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer"
          >
            {YEARS.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </select>
        </>
      )}

      {showDateInputs && (
        <>
          <input
            type="date"
            value={value.customStart}
            onChange={(e) => handleStartChange(e.target.value)}
            className="px-2.5 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-1)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <span className="text-[var(--ink-tertiary)] text-sm">&mdash;</span>
          <input
            type="date"
            value={value.customEnd}
            onChange={(e) => handleEndChange(e.target.value)}
            className="px-2.5 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-1)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </>
      )}


    </div>
  )
}
