# Plan: Agregar "Ayer" y "Hoy" al filtro

## 1. Type `FilterMode` (línea 56)

```diff
- type FilterMode = 'month' | 'last30' | 'last15' | 'last7' | 'custom' | 'all'
+ type FilterMode = 'month' | 'today' | 'yesterday' | 'last30' | 'last15' | 'last7' | 'custom' | 'all'
```

## 2. Cases en `fetchAll` switch (después de `case 'month'`, línea 92)

```ts
case 'today': {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  startDate = start.toISOString()
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  endDate = end.toISOString()
  break
}
case 'yesterday': {
  const start = new Date()
  start.setDate(start.getDate() - 1)
  start.setHours(0, 0, 0, 0)
  startDate = start.toISOString()
  const end = new Date()
  end.setHours(0, 0, 0, 0)
  endDate = end.toISOString()
  break
}
```

## 3. `showDateInputs` (línea 153)

```diff
- const showDateInputs = filterMode === 'custom' || filterMode === 'last30' || filterMode === 'last15' || filterMode === 'last7'
+ const showDateInputs = filterMode === 'custom' || filterMode === 'last30' || filterMode === 'last15' || filterMode === 'last7' || filterMode === 'today' || filterMode === 'yesterday'
```

## 4. `onChange` del select principal — pre-fill custom dates (después del bloque `last30/15/7`, línea 207)

```ts
if (mode === 'today') {
  const d = new Date()
  const today = d.toISOString().split('T')[0]
  setCustomStart(today)
  setCustomEnd(today)
}
if (mode === 'yesterday') {
  const d = new Date()
  const today = d.toISOString().split('T')[0]
  const yesterday = new Date(d)
  yesterday.setDate(yesterday.getDate() - 1)
  setCustomStart(yesterday.toISOString().split('T')[0])
  setCustomEnd(today)
}
```

## 5. Opciones en el `<select>` (después de `last7`, línea 222)

```diff
            <option value="last7">Últimos 7 días</option>
+            <option value="today">Hoy</option>
+            <option value="yesterday">Ayer</option>
            <option value="custom">Personalizar</option>
```
