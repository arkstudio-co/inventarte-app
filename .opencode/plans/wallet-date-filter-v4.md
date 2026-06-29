# Plan v4: "Personalizado" como estado condicional

## Comportamiento deseado

| Estado | Select principal muestra | Controles visibles |
|---|---|---|
| `mode='month'` y mes/año = actual | "Este mes" | month + year selects |
| `mode='month'` y mes/año ≠ actual | **"Personalizado"** (no seleccionable) | month + year selects |
| `mode='custom'` | "Personalizar" (seleccionable) | date inputs |
| Otros modos | su label | ninguno extra |

## Cambio 1 — Añadir "Personalizado" como `<option disabled>`

El `<select>` principal ahora tiene un `value` condicional:

```tsx
const isDefault = filterMode === 'month' && filterMonth === now.getMonth() + 1 && filterYear === now.getFullYear()
const activeLabel = filterMode === 'month' && !isDefault ? 'personalized' : filterMode
```

```tsx
<select value={activeLabel} onChange={(e) => {
  const mode = e.target.value
  if (mode === 'personalized') return // no-op, disabled
  setFilterMode(mode as FilterMode)
  if (mode === 'custom') {
    const d = new Date()
    setCustomEnd(d.toISOString().split('T')[0])
    setCustomStart(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0])
  }
  if (mode === 'month') {
    const d = new Date()
    setFilterMonth(d.getMonth() + 1)
    setFilterYear(d.getFullYear())
  }
}}>
  <option value="month">Este mes</option>
  <option value="personalized" disabled style={{ display: 'none' }}>
    Personalizado
  </option>
  <option value="last30">Últimos 30 días</option>
  <option value="last15">Últimos 15 días</option>
  <option value="last7">Últimos 7 días</option>
  <option value="custom">Personalizar</option>
  <option value="all">Todo el período</option>
</select>
```

> El `<option disabled style={{ display: 'none' }}>` NO se renderiza con `display:none` todo el tiempo, solo cuando NO estamos en estado "personalizado". Cuando `activeLabel === 'personalized'`, el option se muestra y el select lo exhibe como valor actual.

**Corrección:** mejor usar renderizado condicional en lugar de `display: none`:

```tsx
{filterMode === 'month' && !isDefault && (
  <option value="personalized" disabled>Personalizado</option>
)}
```

## Cambio 2 — onChange de mes y año (YA NO switchean a custom)

Ahora simplemente cambian `filterMonth`/`filterYear`. El primer dropdown se actualiza solo gracias al `value` condicional.

```tsx
// month select onChange:
onChange={(e) => setFilterMonth(Number(e.target.value))}

// year select onChange:
onChange={(e) => setFilterYear(Number(e.target.value))}
```

## Cambio 3 — X button

El condition para mostrar el botón X sigue igual (cualquier estado no-default). Al hacer clic resetea a `mode='month'` con mes/año actual.

```tsx
{!isDefault && (
  <button onClick={() => {
    const d = new Date()
    setFilterMode('month')
    setFilterMonth(d.getMonth() + 1)
    setFilterYear(d.getFullYear())
  }} ...>
    <X size={16} />
  </button>
)}
```

## Cambio 4 — Mover `isDefault` + `now` a variable derivada

Actualmente `now` está declarado en el cuerpo del componente. Se mantiene igual. `isDefault` se calcula en el render.
