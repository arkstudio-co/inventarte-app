'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { DateFilter, computeDateRange } from '@/components/ui/DateFilter'
import type { DateFilterState } from '@/components/ui/DateFilter'
import { EntryStockModal } from '@/components/inventory/EntryStockModal'
import { WithdrawalModal } from '@/components/inventory/WithdrawalModal'
import { SaleModal } from '@/components/inventory/SaleModal'
import type { Product } from '@/types/database'

import {
  Plus,
  Search,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CalendarDays,
  ArrowUpDown,
  Eye,
  X,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react'

interface Movement {
  id: string
  date: Date
  dateStr: string
  productId: string
  productName: string
  productSku: string
  type: 'entry' | 'withdrawal'
  quantity: number
  value: number
  balance: number
  reference: string
  observations: string | null
  documentType: string
  paymentStatus: string | null
}

function formatCurrency(n: number) {
  return '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function InventoryMovementsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [products, setProducts] = useState<Product[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<DateFilterState>({
    mode: 'month',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    customStart: '',
    customEnd: '',
  })

  const [showEntryModal, setShowEntryModal] = useState(false)
  const [withdrawalProduct, setWithdrawalProduct] = useState<string | null>(null)
  const [showSaleModal, setShowSaleModal] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setIsLoading(false); setError('Debes iniciar sesión'); return }

    const [productsRes, entriesRes, withdrawalsRes, adjustmentsRes, remisionesRes] = await Promise.all([
      supabase.from('products').select('id, name, sku, stock, price, cost, is_active').eq('is_active', true).order('name'),
      supabase.from('stock_entries').select('*, products!inner(name, sku, cost)').order('created_at', { ascending: false }),
      supabase.from('stock_withdrawals').select('*, products!inner(name, sku, price)').order('withdrawal_date', { ascending: false }),
      supabase.from('stock_adjustments').select('*, products!inner(name, sku, cost)').order('created_at', { ascending: false }),
      supabase.from('remisiones').select('*, remision_items(*), sellers(name)').order('created_at', { ascending: false }),
    ])

    if (productsRes.error) { setError(productsRes.error.message); setIsLoading(false); return }

    const productList = (productsRes.data || []) as any[]
    const entriesList = (entriesRes.data || []) as any[]
    const withdrawalsList = (withdrawalsRes.data || []) as any[]
    const adjustmentsList = (adjustmentsRes.data || []) as any[]
    const remisionesList = (remisionesRes.data || []) as any[]

    const productMap = new Map<string, { name: string; sku: string }>()
    for (const p of productList) productMap.set(p.id, { name: p.name, sku: p.sku })

    const mergedMovements: Movement[] = []

    for (const e of entriesList) {
      const prod = productMap.get(e.product_id)
      if (!prod) continue
      mergedMovements.push({
        id: `entry-${e.id}`, date: new Date(e.created_at), dateStr: e.created_at,
        productId: e.product_id, productName: prod.name, productSku: prod.sku,
        type: 'entry', quantity: e.quantity, value: e.quantity * (e.products?.cost || 0), balance: 0,
        reference: 'Proveedor', observations: e.observations,
        documentType: 'Compra', paymentStatus: e.payment_status,
      })
    }

    for (const w of withdrawalsList) {
      const prod = productMap.get(w.product_id)
      if (!prod) continue
      mergedMovements.push({
        id: `withdrawal-${w.id}`, date: new Date(w.withdrawal_date), dateStr: w.withdrawal_date,
        productId: w.product_id, productName: prod.name, productSku: prod.sku,
        type: 'withdrawal', quantity: w.quantity, value: w.quantity * (w.products?.price || 0), balance: 0,
        reference: w.person_name, observations: w.observations,
        documentType: w.delivery_type === 'paid' ? 'Venta' : 'Retiro', paymentStatus: w.delivery_type,
      })
    }

    for (const a of adjustmentsList) {
      const prod = productMap.get(a.product_id)
      if (!prod) continue
      const qty = a.adjustment_type === 'negative' ? -a.quantity : a.quantity
      mergedMovements.push({
        id: `adj-${a.id}`, date: new Date(a.created_at), dateStr: a.created_at,
        productId: a.product_id, productName: prod.name, productSku: prod.sku,
        type: a.adjustment_type === 'negative' ? 'withdrawal' : 'entry',
        quantity: qty,
        value: qty * (a.products?.cost || 0),
        balance: 0,
        reference: 'Ajuste',
        observations: a.reason || a.reason_code,
        documentType: 'Ajuste',
        paymentStatus: null,
      })
    }

    for (const r of remisionesList) {
      const sellerName = r.sellers?.name
      const itemsList = r.remision_items || []
      if (!itemsList.length) continue
      for (const item of itemsList) {
        const prod = productMap.get(item.product_id) || { name: item.product_name || 'Producto', sku: '' }
        const qty = item.quantity
        mergedMovements.push({
          id: `remision-${r.id}-${item.id}`,
          date: new Date(r.created_at), dateStr: r.created_at,
          productId: item.product_id, productName: prod.name, productSku: prod.sku,
          type: qty > 0 ? 'withdrawal' : 'entry',
          quantity: Math.abs(qty),
          value: Math.abs(item.subtotal ?? qty * (item.unit_price || 0)),
          balance: 0,
          reference: sellerName || 'Venta',
          observations: r.notes ? `REM-${r.remision_number} — ${r.notes}` : `REM-${r.remision_number}`,
          documentType: 'Venta',
          paymentStatus: r.delivery_type || null,
        })
      }
    }

    mergedMovements.sort((a, b) => a.date.getTime() - b.date.getTime())

    const productMovements = new Map<string, Movement[]>()
    for (const m of mergedMovements) {
      const list = productMovements.get(m.productId) || []
      list.push(m)
      productMovements.set(m.productId, list)
    }

    const stockMap = new Map<string, number>()
    for (const p of productList) stockMap.set(p.id, p.stock)

    for (const [prodId, movs] of productMovements) {
      movs.sort((a, b) => a.date.getTime() - b.date.getTime())
      const currentStock = stockMap.get(prodId) || 0
      const totalIn = movs.filter((m) => m.type === 'entry').reduce((s, m) => s + m.quantity, 0)
      const totalOut = movs.filter((m) => m.type === 'withdrawal').reduce((s, m) => s + m.quantity, 0)
      let running = currentStock - totalIn + totalOut
      for (const m of movs) {
        if (m.type === 'entry') running += m.quantity
        else running -= m.quantity
        m.balance = running
      }
    }

    mergedMovements.reverse()
    setMovements(mergedMovements)
    setProducts(productList)
    setIsLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filteredMovements = useMemo(() => {
    const { startDate, endDate } = computeDateRange(filter)
    return movements.filter((m) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        if (!m.productName.toLowerCase().includes(term) &&
            !m.productSku.toLowerCase().includes(term) &&
            !m.reference.toLowerCase().includes(term)) return false
      }
      if (startDate && new Date(m.dateStr) < startDate) return false
      if (endDate && new Date(m.dateStr) >= endDate) return false
      return true
    })
  }, [movements, searchTerm, filter])

  const stats = useMemo(() => {
    const { startDate, endDate } = computeDateRange(filter)
    const periodMovements = movements.filter((m) => {
      if (startDate && new Date(m.dateStr) < startDate) return false
      if (endDate && new Date(m.dateStr) >= endDate) return false
      return true
    })
    const entries = periodMovements.filter((m) => m.type === 'entry').reduce((s, m) => s + m.quantity, 0)
    const withdrawals = periodMovements.filter((m) => m.type === 'withdrawal').reduce((s, m) => s + m.quantity, 0)
    const entriesValue = periodMovements.filter((m) => m.type === 'entry').reduce((s, m) => s + m.value, 0)
    const withdrawalsValue = periodMovements.filter((m) => m.type === 'withdrawal').reduce((s, m) => s + m.value, 0)
    return { entries, withdrawals, total: periodMovements.length, entriesValue, withdrawalsValue }
  }, [movements, filter])

  const clearFilters = () => {
    setSearchTerm('')
    setFilter({ mode: 'month', month: new Date().getMonth() + 1, year: new Date().getFullYear(), customStart: '', customEnd: '' })
  }

  const now = new Date()
  const isDefaultDate = filter.mode === 'month' && filter.month === now.getMonth() + 1 && filter.year === now.getFullYear()
  const hasActiveFilters = searchTerm || !isDefaultDate

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between"><h1 className="text-xl font-semibold text-[var(--ink)]">Movimientos</h1></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4 animate-pulse">
              <div className="h-3 w-16 bg-[var(--surface-2)] rounded mb-2" />
              <div className="h-6 w-12 bg-[var(--surface-2)] rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] animate-pulse p-12" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Movimientos</h1>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-8 text-center">
          <AlertTriangle size={40} className="mx-auto mb-3 text-[var(--danger)]" />
          <p className="text-sm text-[var(--danger)] mb-4">{error}</p>
          <Button onClick={fetchData}><RefreshCw size={16} /> Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--ink)]">Movimientos</h1>
          <p className="text-sm text-[var(--ink-tertiary)] mt-0.5">
            {stats.total} movimientos en el período
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowEntryModal(true)}>
            <Plus size={14} /> Entrada
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowSaleModal(true)}>
            <ShoppingCart size={14} /> Venta
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setWithdrawalProduct('')}>
            <TrendingDown size={14} /> Salida
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
            <TrendingUp size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Entradas</span>
          </div>
          <p className="text-xl font-semibold text-[var(--success)]">+{stats.entries}</p>
          <p className="text-xs text-[var(--success)]/70 mt-0.5">{formatCurrency(stats.entriesValue)}</p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
            <TrendingDown size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Salidas</span>
          </div>
          <p className="text-xl font-semibold text-[var(--danger)]">-{stats.withdrawals}</p>
          <p className="text-xs text-[var(--danger)]/70 mt-0.5">{formatCurrency(stats.withdrawalsValue)}</p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
            <ArrowUpDown size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Balance Neto</span>
          </div>
          <p className={`text-xl font-semibold ${stats.entries - stats.withdrawals >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {stats.entries - stats.withdrawals >= 0 ? '+' : ''}{stats.entries - stats.withdrawals}
          </p>
          <p className={`text-xs mt-0.5 ${stats.entriesValue - stats.withdrawalsValue >= 0 ? 'text-[var(--success)]/70' : 'text-[var(--danger)]/70'}`}>
            {formatCurrency(Math.abs(stats.entriesValue - stats.withdrawalsValue))}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)]" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="Buscar por producto, SKU o referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <DateFilter value={filter} onChange={setFilter} />
        </div>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="mt-3 flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors cursor-pointer">
            <X size={12} /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Movement Table */}
      {filteredMovements.length === 0 ? (
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-8 text-center">
          <Package size={40} className="mx-auto mb-3 text-[var(--ink-muted)]" />
          <p className="text-sm text-[var(--ink-tertiary)]">
            {hasActiveFilters ? 'No hay movimientos con los filtros actuales' : 'No hay movimientos registrados'}
          </p>
          {!hasActiveFilters && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="secondary" onClick={() => setShowEntryModal(true)}><Plus size={14} /> Registrar entrada</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider w-[140px]">
                    <div className="flex items-center gap-1.5"><CalendarDays size={12} /> Fecha</div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">
                    <div className="flex items-center gap-1.5"><Package size={12} /> Producto</div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider w-[100px]">Tipo</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider w-[80px]">
                    <TrendingUp size={12} className="inline mr-1" />IN
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider w-[80px]">
                    <TrendingDown size={12} className="inline mr-1" />OUT
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider w-[80px]">
                    <ArrowUpDown size={12} className="inline mr-1" />Saldo
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider w-[100px]">
                    Valor
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider w-[160px]">Referencia</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider hidden lg:table-cell">Obs.</th>
                  <th className="px-4 py-3 w-[40px]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredMovements.map((m) => (
                  <tr key={m.id} className={`group transition-colors ${m.type === 'entry' ? 'hover:bg-[var(--success)]/5' : 'hover:bg-[var(--danger)]/5'}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-[var(--ink-secondary)] font-mono">
                        {m.date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </span>
                      <span className="text-[11px] text-[var(--ink-muted)] font-mono ml-1.5">
                        {m.date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/products/${m.productId}`)}
                        className="text-sm font-medium text-[var(--ink)] hover:text-[var(--accent)] transition-colors cursor-pointer text-left"
                      >
                        {m.productName}
                      </button>
                      <span className="text-[11px] text-[var(--ink-muted)] font-mono ml-2">{m.productSku}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${m.type === 'entry' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'}`}>
                        {m.type === 'entry' ? <><TrendingUp size={10} /> Entrada</> : <><TrendingDown size={10} /> Salida</>}
                      </span>
                      <span className="text-[11px] text-[var(--ink-muted)] ml-1.5">{m.documentType}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.type === 'entry' ? <span className="text-sm font-semibold text-[var(--success)]">+{m.quantity}</span> : <span className="text-sm text-[var(--ink-muted)]">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.type === 'withdrawal' ? <span className="text-sm font-semibold text-[var(--danger)]">-{m.quantity}</span> : <span className="text-sm text-[var(--ink-muted)]">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-bold font-mono ${m.balance <= 0 ? 'text-[var(--danger)]' : 'text-[var(--ink)]'}`}>{m.balance}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-semibold ${m.type === 'entry' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                        {m.type === 'entry' ? '' : '-'}{formatCurrency(m.value)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[var(--ink-secondary)] max-w-[160px] truncate">{m.reference}</td>
                    <td className="px-4 py-3 text-sm text-[var(--ink-muted)] max-w-[200px] truncate hidden lg:table-cell">{m.observations || <span className="italic">&mdash;</span>}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/products/${m.productId}`)}
                        className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-[var(--radius-sm)] transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Ver producto"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--ink-muted)]">
            <span>{filteredMovements.length} movimientos</span>
            {hasActiveFilters && <span className="text-[var(--ink-tertiary)]">(de {movements.length} totales)</span>}
          </div>
        </div>
      )}

      {/* Entry Modal */}
      <EntryStockModal
        isOpen={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        onSuccess={fetchData}
        products={products}
      />

      {/* Withdrawal Modal */}
      {withdrawalProduct !== null && (
        <WithdrawalModal
          productId={withdrawalProduct}
          onClose={() => setWithdrawalProduct(null)}
          onSuccess={() => { setWithdrawalProduct(null); fetchData() }}
        />
      )}

      {/* Sale Modal */}
      <SaleModal
        isOpen={showSaleModal}
        onClose={() => setShowSaleModal(false)}
        onSuccess={() => { setShowSaleModal(false); fetchData() }}
        products={products}
      />
    </div>
  )
}
