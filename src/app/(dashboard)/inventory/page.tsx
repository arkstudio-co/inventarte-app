'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { DateFilter, computeDateRange } from '@/components/ui/DateFilter'
import type { DateFilterState } from '@/components/ui/DateFilter'
import { CreateProductModal } from '@/components/inventory/CreateProductModal'
import { WithdrawalModal } from '@/components/inventory/WithdrawalModal'
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
  Box,
  RefreshCw,
} from 'lucide-react'
import type { Product } from '@/types/database'

interface Movement {
  id: string
  date: Date
  dateStr: string
  productId: string
  productName: string
  productSku: string
  type: 'entry' | 'withdrawal'
  quantity: number
  balance: number
  reference: string
  observations: string | null
  documentType: string
  paymentStatus: string | null
}

interface ProductWithStock extends Product {
  initialStock: number
  totalEntries: number
  totalWithdrawals: number
}

export default function InventoryMovementsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [products, setProducts] = useState<ProductWithStock[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<DateFilterState>({
    mode: 'all',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    customStart: '',
    customEnd: '',
  })

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [withdrawalProduct, setWithdrawalProduct] = useState<string | null>(null)

  const [entryProductId, setEntryProductId] = useState('')
  const [entryQuantity, setEntryQuantity] = useState(1)
  const [entryPaymentStatus, setEntryPaymentStatus] = useState<'paid' | 'pending'>('pending')
  const [entryObservations, setEntryObservations] = useState('')
  const [isAddingEntry, setIsAddingEntry] = useState(false)
  const [entryError, setEntryError] = useState('')

  const fetchData = async () => {
    setIsLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setIsLoading(false)
      setError('Debes iniciar sesión')
      return
    }

    const [productsRes, entriesRes, withdrawalsRes] = await Promise.all([
      supabase
        .from('products')
        .select('*, suppliers(name)')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('stock_entries')
        .select('*, products!inner(name, sku, suppliers(name))')
        .order('created_at', { ascending: false }),
      supabase
        .from('stock_withdrawals')
        .select('*, products!inner(name, sku)')
        .order('withdrawal_date', { ascending: false }),
    ])

    if (productsRes.error) {
      setError(productsRes.error.message)
      setIsLoading(false)
      return
    }

    const productList = (productsRes.data || []) as any[]
    const entriesList = (entriesRes.data || []) as any[]
    const withdrawalsList = (withdrawalsRes.data || []) as any[]

    const productMap = new Map<string, { name: string; sku: string; stock: number }>()
    for (const p of productList) {
      productMap.set(p.id, { name: p.name, sku: p.sku, stock: p.stock })
    }

    const mergedMovements: Movement[] = []

    for (const e of entriesList) {
      const prod = productMap.get(e.product_id)
      if (!prod) continue
      mergedMovements.push({
        id: `entry-${e.id}`,
        date: new Date(e.created_at),
        dateStr: e.created_at,
        productId: e.product_id,
        productName: prod.name,
        productSku: prod.sku,
        type: 'entry',
        quantity: e.quantity,
        balance: 0,
        reference: e.products?.suppliers?.name || 'Proveedor directo',
        observations: e.observations,
        documentType: 'Compra',
        paymentStatus: e.payment_status,
      })
    }

    for (const w of withdrawalsList) {
      const prod = productMap.get(w.product_id)
      if (!prod) continue
      mergedMovements.push({
        id: `withdrawal-${w.id}`,
        date: new Date(w.withdrawal_date),
        dateStr: w.withdrawal_date,
        productId: w.product_id,
        productName: prod.name,
        productSku: prod.sku,
        type: 'withdrawal',
        quantity: w.quantity,
        balance: 0,
        reference: w.person_name,
        observations: w.observations,
        documentType: w.delivery_type === 'paid' ? 'Venta' : 'Retiro',
        paymentStatus: w.delivery_type,
      })
    }

    mergedMovements.sort((a, b) => a.date.getTime() - b.date.getTime())

    const productsWithStats: ProductWithStock[] = productList.map((p: any) => {
      const productEntries = mergedMovements.filter((m) => m.productId === p.id && m.type === 'entry')
      const productWithdrawals = mergedMovements.filter((m) => m.productId === p.id && m.type === 'withdrawal')
      const totalEntries = productEntries.reduce((sum, m) => sum + m.quantity, 0)
      const totalWithdrawals = productWithdrawals.reduce((sum, m) => sum + m.quantity, 0)
      const initialStock = p.stock - totalEntries + totalWithdrawals
      return {
        ...p,
        initialStock,
        totalEntries,
        totalWithdrawals,
      }
    })

    const productMovements = new Map<string, Movement[]>()
    for (const m of mergedMovements) {
      const list = productMovements.get(m.productId) || []
      list.push(m)
      productMovements.set(m.productId, list)
    }

    for (const [prodId, movs] of productMovements) {
      movs.sort((a, b) => a.date.getTime() - b.date.getTime())
      const prod = productsWithStats.find((p) => p.id === prodId)
      if (!prod) continue
      let running = prod.initialStock
      for (const m of movs) {
        if (m.type === 'entry') {
          running += m.quantity
        } else {
          running -= m.quantity
        }
        m.balance = running
      }
    }

    mergedMovements.reverse()

    setProducts(productsWithStats)
    setMovements(mergedMovements)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredMovements = useMemo(() => {
    const { startDate, endDate } = computeDateRange(filter)

    return movements.filter((m) => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        const matchName = m.productName.toLowerCase().includes(term)
        const matchSku = m.productSku.toLowerCase().includes(term)
        const matchRef = m.reference.toLowerCase().includes(term)
        if (!matchName && !matchSku && !matchRef) return false
      }

      if (startDate && new Date(m.dateStr) < startDate) return false
      if (endDate && new Date(m.dateStr) >= endDate) return false

      return true
    })
  }, [movements, searchTerm, filter])

  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const entriesToday = movements.filter(
      (m) => m.type === 'entry' && m.date >= today && m.date < tomorrow
    ).reduce((s, m) => s + m.quantity, 0)

    const withdrawalsToday = movements.filter(
      (m) => m.type === 'withdrawal' && m.date >= today && m.date < tomorrow
    ).reduce((s, m) => s + m.quantity, 0)

    const lowStock = products.filter((p) => p.stock <= p.min_stock).length

    return {
      totalProducts: products.length,
      lowStock,
      entriesToday,
      withdrawalsToday,
    }
  }, [products, movements])

  const handleQuickEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    setEntryError('')
    if (entryQuantity < 1) {
      setEntryError('La cantidad debe ser mayor a 0')
      return
    }
    setIsAddingEntry(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setEntryError('Debes iniciar sesión')
      setIsAddingEntry(false)
      return
    }
    const { error: insertError } = await supabase.from('stock_entries').insert({
      product_id: entryProductId,
      quantity: entryQuantity,
      payment_status: entryPaymentStatus,
      observations: entryObservations || null,
      created_by: user.id,
    })
    if (insertError) {
      setEntryError(insertError.message)
      setIsAddingEntry(false)
      return
    }
    await supabase.rpc('increment_stock', {
      p_product_id: entryProductId,
      p_quantity: entryQuantity,
    })
    setIsAddingEntry(false)
    setShowEntryModal(false)
    setEntryQuantity(1)
    setEntryPaymentStatus('pending')
    setEntryObservations('')
    setEntryProductId('')
    fetchData()
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilter({
      mode: 'all',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
      customStart: '',
      customEnd: '',
    })
  }

  const hasActiveFilters = searchTerm || filter.mode !== 'all'

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--ink)]">Movimientos</h1>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4 animate-pulse">
              <div className="h-3 w-16 bg-[var(--surface-2)] rounded mb-2" />
              <div className="h-6 w-12 bg-[var(--surface-2)] rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)]">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 border-b border-[var(--border-subtle)] last:border-0 animate-pulse">
              <div className="h-4 w-24 bg-[var(--surface-2)] rounded" />
              <div className="h-4 w-32 bg-[var(--surface-2)] rounded" />
              <div className="h-4 w-16 bg-[var(--surface-2)] rounded" />
              <div className="h-4 w-12 bg-[var(--surface-2)] rounded ml-auto" />
            </div>
          ))}
        </div>
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
          <Button onClick={fetchData}>
            <RefreshCw size={16} /> Reintentar
          </Button>
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
            {movements.length} movimientos &middot; {products.length} productos activos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowEntryModal(true)}>
            <Plus size={14} /> Entrada
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setWithdrawalProduct('')}>
            <TrendingDown size={14} /> Salida
          </Button>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Package size={14} /> Producto
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
            <Box size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Productos</span>
          </div>
          <p className="text-xl font-semibold text-[var(--ink)]">{stats.totalProducts}</p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--warning)] mb-1">
            <AlertTriangle size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Stock Bajo</span>
          </div>
          <p className={`text-xl font-semibold ${stats.lowStock > 0 ? 'text-[var(--warning)]' : 'text-[var(--ink)]'}`}>
            {stats.lowStock}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--success)] mb-1">
            <TrendingUp size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Entradas Hoy</span>
          </div>
          <p className="text-xl font-semibold text-[var(--success)]">+{stats.entriesToday}</p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--danger)] mb-1">
            <TrendingDown size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Salidas Hoy</span>
          </div>
          <p className="text-xl font-semibold text-[var(--danger)]">-{stats.withdrawalsToday}</p>
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
          <button
            onClick={clearFilters}
            className="mt-3 flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors cursor-pointer"
          >
            <X size={12} /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Movement Table */}
      {filteredMovements.length === 0 ? (
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-8 text-center">
          <Package size={40} className="mx-auto mb-3 text-[var(--ink-muted)]" />
          <p className="text-sm text-[var(--ink-tertiary)]">
            {hasActiveFilters
              ? 'No hay movimientos con los filtros actuales'
              : 'No hay movimientos registrados'}
          </p>
          {!hasActiveFilters && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button variant="secondary" onClick={() => setShowEntryModal(true)}>
                <Plus size={14} /> Registrar entrada
              </Button>
              <Button variant="secondary" onClick={() => setShowCreateModal(true)}>
                <Package size={14} /> Crear producto
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider whitespace-nowrap w-[140px]">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays size={12} />
                      Fecha
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Package size={12} />
                      Producto
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider whitespace-nowrap w-[100px]">
                    Tipo
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider whitespace-nowrap w-[100px]">
                    <div className="flex items-center justify-end gap-1">
                      <TrendingUp size={12} />
                      IN
                    </div>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider whitespace-nowrap w-[100px]">
                    <div className="flex items-center justify-end gap-1">
                      <TrendingDown size={12} />
                      OUT
                    </div>
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider whitespace-nowrap w-[100px]">
                    <div className="flex items-center justify-end gap-1">
                      <ArrowUpDown size={12} />
                      Saldo
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider whitespace-nowrap w-[160px]">
                    Referencia
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider whitespace-nowrap hidden lg:table-cell">
                    Observaciones
                  </th>
                  <th className="px-4 py-3 w-[40px]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredMovements.map((m) => (
                  <tr
                    key={m.id}
                    className={`group transition-colors ${
                      m.type === 'entry'
                        ? 'hover:bg-[var(--success)]/5'
                        : 'hover:bg-[var(--danger)]/5'
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs text-[var(--ink-secondary)] font-mono">
                        {m.date.toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-[11px] text-[var(--ink-muted)] font-mono ml-1.5">
                        {m.date.toLocaleTimeString('es-CO', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/inventory/${m.productId}`)}
                        className="text-sm font-medium text-[var(--ink)] hover:text-[var(--accent)] transition-colors cursor-pointer text-left"
                      >
                        {m.productName}
                      </button>
                      <span className="text-[11px] text-[var(--ink-muted)] font-mono ml-2">
                        {m.productSku}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          m.type === 'entry'
                            ? 'bg-[var(--success)]/10 text-[var(--success)]'
                            : 'bg-[var(--danger)]/10 text-[var(--danger)]'
                        }`}
                      >
                        {m.type === 'entry' ? (
                          <>
                            <TrendingUp size={10} />
                            Entrada
                          </>
                        ) : (
                          <>
                            <TrendingDown size={10} />
                            Salida
                          </>
                        )}
                      </span>
                      <span className="text-[11px] text-[var(--ink-muted)] ml-1.5">
                        {m.documentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {m.type === 'entry' ? (
                        <span className="text-sm font-semibold text-[var(--success)]">
                          +{m.quantity}
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--ink-muted)]">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      {m.type === 'withdrawal' ? (
                        <span className="text-sm font-semibold text-[var(--danger)]">
                          -{m.quantity}
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--ink-muted)]">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <span className={`text-sm font-bold font-mono ${
                        m.balance <= 0
                          ? 'text-[var(--danger)]'
                          : m.type === 'entry'
                          ? 'text-[var(--ink)]'
                          : 'text-[var(--ink)]'
                      }`}>
                        {m.balance}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--ink-secondary)] max-w-[160px] truncate">
                      {m.reference}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--ink-muted)] max-w-[200px] truncate hidden lg:table-cell">
                      {m.observations || (
                        <span className="italic">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/inventory/${m.productId}`)}
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

          {/* Table Footer */}
          <div className="px-4 py-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--ink-muted)]">
            <span>{filteredMovements.length} movimientos</span>
            {hasActiveFilters && (
              <span className="text-[var(--ink-tertiary)]">
                (de {movements.length} totales)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Low Stock Alert Section */}
      {stats.lowStock > 0 && movements.length > 0 && (
        <div className="rounded-[var(--radius-md)] bg-[var(--warning)]/5 border border-[var(--warning)]/20 p-4">
          <div className="flex items-center gap-2 text-[var(--warning)] mb-2">
            <AlertTriangle size={16} />
            <span className="text-sm font-semibold">Productos con stock bajo</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {products
              .filter((p) => p.stock <= p.min_stock)
              .slice(0, 5)
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/inventory/${p.id}`)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] bg-[var(--surface-1)] border border-[var(--border-default)] text-xs text-[var(--ink-secondary)] hover:border-[var(--warning)]/40 transition-colors cursor-pointer"
                >
                  <span className="font-medium text-[var(--ink)]">{p.name}</span>
                  <span className="text-[var(--warning)] font-semibold">{p.stock}/{p.min_stock}</span>
                </button>
              ))}
            {products.filter((p) => p.stock <= p.min_stock).length > 5 && (
              <span className="text-xs text-[var(--ink-muted)] self-center">
                +{products.filter((p) => p.stock <= p.min_stock).length - 5} más
              </span>
            )}
          </div>
        </div>
      )}

      {/* Create Product Modal */}
      <CreateProductModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false)
          fetchData()
        }}
      />

      {/* Stock Entry Modal */}
      <Modal
        isOpen={showEntryModal}
        onClose={() => {
          setShowEntryModal(false)
          setEntryProductId('')
          setEntryQuantity(1)
          setEntryPaymentStatus('pending')
          setEntryObservations('')
          setEntryError('')
        }}
        title="Registrar Entrada de Stock"
      >
        <form onSubmit={handleQuickEntry} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Producto</label>
            <select
              value={entryProductId}
              onChange={(e) => setEntryProductId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              required
            >
              <option value="">Seleccionar producto</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) &mdash; Stock: {p.stock}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Cantidad"
            type="number"
            min={1}
            value={entryQuantity}
            onChange={(e) => setEntryQuantity(Number(e.target.value))}
            required
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Estado de pago</label>
            <select
              value={entryPaymentStatus}
              onChange={(e) => setEntryPaymentStatus(e.target.value as 'paid' | 'pending')}
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="pending">Pendiente</option>
              <option value="paid">Pagado</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Observaciones</label>
            <textarea
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
              rows={2}
              value={entryObservations}
              onChange={(e) => setEntryObservations(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          {entryError && (
            <div className="text-sm text-[var(--danger)] bg-[var(--danger-light)] px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--danger)]/20">
              {entryError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowEntryModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isAddingEntry || !entryProductId}>
              {isAddingEntry ? 'Registrando...' : 'Registrar Entrada'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Withdrawal Modal */}
      {withdrawalProduct !== null && (
        <WithdrawalModal
          productId={withdrawalProduct}
          onClose={() => setWithdrawalProduct(null)}
          onSuccess={() => {
            setWithdrawalProduct(null)
            fetchData()
          }}
        />
      )}
    </div>
  )
}
