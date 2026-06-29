# Plan v3: Auto-switch to custom on month/year change

## Cambio 1 — Al seleccionar "Este mes", resetear mes/año a actual

En el `onChange` del select principal (`filterMode`), agregar:
```ts
if (mode === 'month') {
  const d = new Date()
  setFilterMonth(d.getMonth() + 1)
  setFilterYear(d.getFullYear())
}
```

## Cambio 2 — Al cambiar mes/año en modo month, switchear a custom

Modificar el `onChange` del select de **meses**:

```tsx
onChange={(e) => {
  const m = Number(e.target.value)
  const d = new Date()
  if (filterMode === 'month' && (m !== d.getMonth() + 1 || filterYear !== d.getFullYear())) {
    const start = m === 0
      ? new Date(filterYear, 0, 1)
      : new Date(filterYear, m - 1, 1)
    const end = m === 0
      ? new Date(filterYear, 11, 31)
      : new Date(filterYear, m, 0)
    setFilterMode('custom')
    setFilterMonth(m)
    setCustomStart(start.toISOString().split('T')[0])
    setCustomEnd(end.toISOString().split('T')[0])
  } else {
    setFilterMonth(m)
  }
}}
```

Modificar el `onChange` del select de **años**:

```tsx
onChange={(e) => {
  const y = Number(e.target.value)
  const d = new Date()
  if (filterMode === 'month' && (filterMonth !== d.getMonth() + 1 || y !== d.getFullYear())) {
    const start = filterMonth === 0
      ? new Date(y, 0, 1)
      : new Date(y, filterMonth - 1, 1)
    const end = filterMonth === 0
      ? new Date(y, 11, 31)
      : new Date(y, filterMonth, 0)
    setFilterMode('custom')
    setFilterYear(y)
    setCustomStart(start.toISOString().split('T')[0])
    setCustomEnd(end.toISOString().split('T')[0])
  } else {
    setFilterYear(y)
  }
}}
```

## Lógica de pre-relleno en custom

- Si venía de un mes específico (1-12): `customStart` = 1ro de ese mes, `customEnd` = último día de ese mes
- Si venía de "Todos los meses" (0): `customStart` = 1ro de enero, `customEnd` = 31 de diciembre

## Cambio 3 — Renombrar "Personalizar" → "Personalizado"

En el `<option value="custom">` del select principal, cambiar el label:

```diff
- <option value="custom">Personalizar</option>
+ <option value="custom">Personalizado</option>
```
