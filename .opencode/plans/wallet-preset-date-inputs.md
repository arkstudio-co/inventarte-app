# Plan: Mostrar date inputs en presets (Últimos 30/15/7 días)

## Cambio 1 — Reemplazar `presetRange` por `showDateInputs` (líneas 153-162)

```diff
-  const presetRange = filterMode === 'last30' || filterMode === 'last15' || filterMode === 'last7'
-    ? (() => {
-        const d = new Date()
-        const days = filterMode === 'last30' ? 30 : filterMode === 'last15' ? 15 : 7
-        const start = new Date(d.getTime() - days * 24 * 60 * 60 * 1000)
-        const fmt = (date: Date) =>
-          date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
-        return `${fmt(start)} → ${fmt(d)}`
-      })()
-    : null
+  const showDateInputs = filterMode === 'custom' || filterMode === 'last30' || filterMode === 'last15' || filterMode === 'last7'
```

## Cambio 2 — En el `onChange` del select principal, setear customStart/customEnd para presets

Agregar dentro del `onChange`:
```ts
if (mode === 'last30' || mode === 'last15' || mode === 'last7') {
  const d = new Date()
  const days = mode === 'last30' ? 30 : mode === 'last15' ? 15 : 7
  const start = new Date(d.getTime() - days * 24 * 60 * 60 * 1000)
  setCustomEnd(d.toISOString().split('T')[0])
  setCustomStart(start.toISOString().split('T')[0])
}
```

## Cambio 3 — JSX: reemplazar el span `presetRange` y unificar la condición de date inputs

Reemplazar:
```tsx
          {presetRange && (
            <span className="text-xs text-[var(--ink-tertiary)] whitespace-nowrap">
              {presetRange}
            </span>
          )}

          {filterMode === 'custom' && (
```

Por:
```tsx
          {showDateInputs && (
```

Y en el `onChange` de los date inputs, switchear a custom si se modifica un preset:
```tsx
onChange={(e) => {
  setCustomStart(e.target.value)
  if (filterMode !== 'custom') setFilterMode('custom')
}}
```

```tsx
onChange={(e) => {
  setCustomEnd(e.target.value)
  if (filterMode !== 'custom') setFilterMode('custom')
}}
```
