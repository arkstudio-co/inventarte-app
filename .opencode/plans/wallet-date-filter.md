# Plan: Wallet Date Filter

## File to edit
`src/app/(dashboard)/wallet/page.tsx`

## 1. Replace state (line 57)

**Before:**
```tsx
const [inventoryValue, setInventoryValue] = useState(0)
const [monthFilter, setMonthFilter] = useState<{ year: number; month: number } | null>(null)
```

**After:**
```tsx
type FilterMode = 'month' | 'last30' | 'last15' | 'last7' | 'custom' | 'all'

const now = new Date()
const [filterMode, setFilterMode] = useState<FilterMode>('month')
const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1)
const [filterYear, setFilterYear] = useState(now.getFullYear())
const [customStart, setCustomStart] = useState('')
const [customEnd, setCustomEnd] = useState('')
const [inventoryValue, setInventoryValue] = useState(0)
```

## 2. Update fetchAll date calculation (lines 68-71)

**Before:**
```tsx
const fetchAll = async () => {
    const startDate = monthFilter ? new Date(monthFilter.year, monthFilter.month - 1, 1).toISOString() : null
    const endDate = monthFilter ? new Date(monthFilter.year, monthFilter.month, 1).toISOString() : null
    const wf = (q: any, col: string) => startDate ? q.gte(col, startDate).lt(col, endDate) : q
```

**After:**
```tsx
const fetchAll = async () => {
    const now = new Date()
    let startDate: string | null = null
    let endDate: string | null = null

    switch (filterMode) {
      case 'month':
        startDate = new Date(filterYear, filterMonth - 1, 1).toISOString()
        endDate = new Date(filterYear, filterMonth, 1).toISOString()
        break
      case 'last30':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
        endDate = now.toISOString()
        break
      case 'last15':
        startDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString()
        endDate = now.toISOString()
        break
      case 'last7':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
        endDate = now.toISOString()
        break
      case 'custom':
        if (customStart && customEnd) {
          startDate = new Date(customStart + 'T00:00:00').toISOString()
          const end = new Date(customEnd)
          end.setDate(end.getDate() + 1)
          endDate = end.toISOString()
        }
        break
    }

    const wf = (q: any, col: string) => startDate ? q.gte(col, startDate).lt(col, endDate) : q
```

## 3. Update useEffect dependency (line 96)

**Before:**
```tsx
useEffect(() => { fetchAll() }, [monthFilter])
```

**After:**
```tsx
useEffect(() => { fetchAll() }, [filterMode, filterMonth, filterYear, customStart, customEnd])
```

## 4. Replace filter UI (lines 135-175)

**Before:**
```tsx
        {/* Month filter */}
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-[var(--ink-tertiary)]" />
          <select
            value={monthFilter?.month || ''}
            onChange={(e) => {
              const m = Number(e.target.value)
              const y = monthFilter?.year || currentYear
              setMonthFilter(m ? { year: y, month: m } : null)
            }}
            ...
          >
            ...
          </select>
          ...
          {monthFilter && (
            <button onClick={() => setMonthFilter(null)} ...>
              <X size={16} />
            </button>
          )}
        </div>
```

**After:**
```tsx
        {/* Date filter */}
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-[var(--ink-tertiary)]" />
          <select
            value={filterMode}
            onChange={(e) => {
              const mode = e.target.value as FilterMode
              setFilterMode(mode)
              if (mode === 'custom') {
                const d = new Date()
                setCustomEnd(d.toISOString().split('T')[0])
                setCustomStart(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0])
              }
            }}
            className="px-2.5 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-1)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer"
          >
            <option value="month">Este mes</option>
            <option value="last30">Últimos 30 días</option>
            <option value="last15">Últimos 15 días</option>
            <option value="last7">Últimos 7 días</option>
            <option value="custom">Personalizar</option>
            <option value="all">Todos</option>
          </select>

          {filterMode === 'month' && (
            <>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(Number(e.target.value))}
                className="px-2.5 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-1)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer"
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="px-2.5 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-1)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer"
              >
                {YEARS.map((y) => (
                  <option key={y.value} value={y.value}>{y.label}</option>
                ))}
              </select>
            </>
          )}

          {filterMode === 'custom' && (
            <>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-1)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
              <span className="text-[var(--ink-tertiary)] text-sm">—</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-1)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </>
          )}

          {(filterMode !== 'month' || filterMonth !== now.getMonth() + 1 || filterYear !== now.getFullYear()) && (
            <button
              onClick={() => {
                const d = new Date()
                setFilterMode('month')
                setFilterMonth(d.getMonth() + 1)
                setFilterYear(d.getFullYear())
              }}
              className="p-1.5 text-[var(--ink-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"
              title="Restablecer filtro predeterminado"
            >
              <X size={16} />
            </button>
          )}
        </div>
```

> **Note:** The `const now = new Date()` inside the component body (step 1) and in the X-button click handler are separate instances — each evaluated at render/click time. The `now` in the state initialization ensures month/year default to today's values on first render.
