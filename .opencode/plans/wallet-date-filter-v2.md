# Plan v2: Wallet Date Filter — refinements

## Summary of changes (3 refinements)

### 1. Mes "Todos" en el selector de meses

**Dónde:** `filterMode === 'month'` → selector de meses

Añadir `<option value="0">Todos los meses</option>` como primera opción en el `<select>` de meses, antes de `MONTHS.map`.

Actualizar `fetchAll` case `'month'` para que cuando `filterMonth === 0` calcule el rango como el año completo:
```ts
case 'month':
  if (filterMonth === 0) {
    startDate = new Date(filterYear, 0, 1).toISOString()
    endDate = new Date(filterYear + 1, 0, 1).toISOString()
  } else {
    startDate = new Date(filterYear, filterMonth - 1, 1).toISOString()
    endDate = new Date(filterYear, filterMonth, 1).toISOString()
  }
  break
```

### 2. Saldo Disponible independiente de fechas

**Dónde:** en `fetchAll`, añadir 3 queries **sin** filtro de fecha para calcular el balance real (todo el período).

- Nuevos estados:
```ts
const [balanceIncome, setBalanceIncome] = useState(0)
const [balancePayments, setBalancePayments] = useState(0)
const [balanceExpenses, setBalanceExpenses] = useState(0)
```

- En `Promise.all`, añadir estas 3 queries sin `wf`:
```ts
supabase.from('stock_withdrawals').select('quantity, products!inner(price)').eq('delivery_type', 'paid'),
supabase.from('payments').select('amount'),
supabase.from('stock_entries').select('quantity, products!inner(cost)'),
```

- Desestructurar en el array de resultados y procesar:
```ts
// ...existing destructuring..., balanceIncomeRes, balancePaymentsRes, balanceExpensesRes
if (balanceIncomeRes.data) setBalanceIncome(...)
if (balancePaymentsRes.data) setBalancePayments(...)
if (balanceExpensesRes.data) setBalanceExpenses(...)
```

- Actualizar la línea 137:
```ts
const balance = balanceIncome + balancePayments - balanceExpenses
```

### 3. Renombrar opción "Todos" → "Todo el período"

**Dónde:** línea 192 del main filter select.

```diff
- <option value="all">Todos</option>
+ <option value="all">Todo el período</option>
```
