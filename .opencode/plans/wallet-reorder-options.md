# Plan: Reordenar opciones del filtro ascendente

## Orden actual

```
Este mes, Personalizado, Últimos 30 días, Últimos 15 días, Últimos 7 días, Hoy, Ayer, Personalizar, Todo el período
```

## Orden nuevo (ascendente por período)

```
Este mes, Personalizado, Hoy, Ayer, Últimos 7 días, Últimos 15 días, Últimos 30 días, Personalizar, Todo el período
```

## Cambio único

Reordenar las líneas 253-258 del `<select>`:

```diff
            <option value="month">Este mes</option>
            {!isDefault && filterMode === 'month' && (
              <option value="personalized" disabled>Personalizado</option>
            )}
-            <option value="last30">Últimos 30 días</option>
-            <option value="last15">Últimos 15 días</option>
-            <option value="last7">Últimos 7 días</option>
-            <option value="today">Hoy</option>
-            <option value="yesterday">Ayer</option>
+            <option value="today">Hoy</option>
+            <option value="yesterday">Ayer</option>
+            <option value="last7">Últimos 7 días</option>
+            <option value="last15">Últimos 15 días</option>
+            <option value="last30">Últimos 30 días</option>
            <option value="custom">Personalizar</option>
            <option value="all">Todo el período</option>
```
