# Plan: Mostrar rango de fechas en presets

## Cambio

Cuando `filterMode` es `'last30'`, `'last15'` o `'last7'`, mostrar un pequeño label al lado del `<select>` principal indicando el rango de fechas que cubre.

Ejemplo (hoy = 29 jun 2026):
- "Últimos 30 días" → muestra `30 may → 29 jun`
- "Últimos 15 días" → muestra `14 jun → 29 jun`
- "Últimos 7 días" → muestra `22 jun → 29 jun`

## Implementación

### 1. Variable derivada (después de `isDefault`, línea 152)

```ts
const presetRange = filterMode === 'last30' || filterMode === 'last15' || filterMode === 'last7'
  ? (() => {
      const now = new Date()
      const days = filterMode === 'last30' ? 30 : filterMode === 'last15' ? 15 : 7
      const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      const fmt = (d: Date) =>
        d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
      return `${fmt(start)} → ${fmt(now)}`
    })()
  : null
```

### 2. JSX — después del `<select>` principal, antes de los controles condicionales

```tsx
{/* ... filter mode select ... */}

{presetRange && (
  <span className="text-xs text-[var(--ink-tertiary)] whitespace-nowrap">
    {presetRange}
  </span>
)}

{filterMode === 'month' && ( ... )}
```
