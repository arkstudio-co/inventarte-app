# Plan: "Personalizado" como estado condicional global

## Cambio 1 — Añadir `hasCustomized` state (después de `customEnd`, ~line 67)

```ts
const [hasCustomized, setHasCustomized] = useState(false)
```

## Cambio 2 — Variable `showPersonalized` (después de `showDateInputs`, ~line 153)

```ts
const showPersonalized = hasCustomized || (filterMode === 'month' && !isDefault)
```

## Cambio 3 — `<select>` value (actual línea 210)

```diff
- value={isDefault || filterMode !== 'month' ? filterMode : 'personalized'}
+ value={showPersonalized ? 'personalized' : filterMode}
```

## Cambio 4 — Condición del `<option disabled>` (línea 250)

```diff
- {!isDefault && filterMode === 'month' && (
+ {showPersonalized && (
```

## Cambio 5 — Reset `hasCustomized` en el onChange del select (inicio del handler, línea 212→214)

```ts
onChange={(e) => {
  const mode = e.target.value
  if (mode === 'personalized') return
  setHasCustomized(false)
  setFilterMode(mode as FilterMode)
  // ... rest
}}
```

## Cambio 6 — Set `hasCustomized` en date inputs (líneas 292-294 y 302-304)

Agregar `setHasCustomized(true)` en ambos `onChange`:

```ts
onChange={(e) => {
  setCustomStart(e.target.value)
  if (filterMode !== 'custom') setFilterMode('custom')
  setHasCustomized(true)
}}
```

## Cambio 7 — Reset en X button (línea 314)

```ts
onClick={() => {
  const d = new Date()
  setHasCustomized(false)
  setFilterMode('month')
  ...
}}
```

## Cambio 8 — Reordenar opciones (ascendente)

```
Este mes → (Personalizado condicional) → Hoy → Ayer → Últimos 7 días → Últimos 15 días → Últimos 30 días → Personalizar → Todo el período
```
