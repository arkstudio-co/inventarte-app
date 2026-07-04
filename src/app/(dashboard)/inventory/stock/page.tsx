'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { CreateProductModal } from '@/components/inventory/CreateProductModal'
import { WithdrawalModal } from '@/components/inventory/WithdrawalModal'
import {
  Search,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Eye,
  Plus,
  Box,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  DollarSign,
} from 'lucide-react'
import type { Product } from '@/types/database'

interface InventoryProduct extends Product {
  totalEntries: number
  totalWithdrawals: number
  lastEntryDate: string | null
  lastWithdrawalDate: string | null
  lastMovementDate: string | null
}

type SortField = 'name' | 'stock' | 'min_stock' | 'cost' | 'price' | 'stockValue' | 'margin'
type SortDir = 'asc' | 'desc'
type StockStatus = 'all' | 'available' | 'low' | 'out'

export default function InventoryStockPage() {
  const router = useRouter()
  const supabase = createClient()

  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<StockStatus>('all')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEntryModal, setShowEntryModal] = useState(false)
  const [withdrawalProduct, setWithdrawalProduct] = useState<string | null>(null)

  const [entryProductId, setEntryProductId] = useState('')
  const [entryQuantity, setEntryQuantity] = useState<number | ''>(1)
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

    const [productsRes, entriesRes, withdrawalsRes, suppliersRes] = await Promise.all([
      supabase.from('products').select('*, suppliers(name)').order('name'),
      supabase.from('stock_entries').select('product_id, created_at, quantity').order('created_at', { ascending: false }),
      supabase.from('stock_withdrawals').select('product_id, withdrawal_date, quantity').order('withdrawal_date', { ascending: false }),
      supabase.from('suppliers').select('id, name').order('name'),
    ])

    if (productsRes.error) {
      setError(productsRes.error.message)
      setIsLoading(false)
      return
    }

    const productList = (productsRes.data || []) as any[]
    const entriesList = (entriesRes.data || []) as any[]
    const withdrawalsList = (withdrawalsRes.data || []) as any[]

    const entryCounts = new Map<string, { total: number; lastDate: string | null }>()
    for (const e of entriesList) {
      const existing = entryCounts.get(e.product_id)
      if (!existing) {
        entryCounts.set(e.product_id, { total: e.quantity, lastDate: e.created_at })
      } else {
        existing.total += e.quantity
      }
    }

    const withdrawalCounts = new Map<string, { total: number; lastDate: string | null }>()
    for (const w of withdrawalsList) {
      const existing = withdrawalCounts.get(w.product_id)
      if (!existing) {
        withdrawalCounts.set(w.product_id, { total: w.quantity, lastDate: w.withdrawal_date })
      } else {
        existing.total += w.quantity
      }
    }

    const enriched: InventoryProduct[] = productList.map((p: any) => {
      const entryData = entryCounts.get(p.id)
      const withdrawalData = withdrawalCounts.get(p.id)
      const totalEntries = entryData?.total || 0
      const totalWithdrawals = withdrawalData?.total || 0
      const lastEntryDate = entryData?.lastDate || null
      const lastWithdrawalDate = withdrawalData?.lastDate || null
      const lastMovementDate = lastEntryDate && lastWithdrawalDate
        ? new Date(lastEntryDate) > new Date(lastWithdrawalDate) ? lastEntryDate : lastWithdrawalDate
        : lastEntryDate || lastWithdrawalDate

      return {
        ...p,
        totalEntries,
        totalWithdrawals,
        lastEntryDate,
        lastWithdrawalDate,
        lastMovementDate,
      }
    })

    setProducts(enriched)
    if (suppliersRes.data) setSuppliers(suppliersRes.data)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (statusFilter === 'low' && p.stock > p.min_stock) return false
        if (statusFilter === 'low' && p.stock === 0) return false
        if (statusFilter === 'out' && p.stock !== 0) return false
        if (statusFilter === 'available' && p.stock === 0) return false
        if (supplierFilter && p.supplier_id !== supplierFilter) return false
        if (searchTerm) {
          const term = searchTerm.toLowerCase()
          const matchName = p.name.toLowerCase().includes(term)
          const matchSku = p.sku.toLowerCase().includes(term)
          if (!matchName && !matchSku) return false
        }
        return true
      })
      .sort((a, b) => {
        let cmp = 0
        switch (sortField) {
          case 'name':
            cmp = a.name.localeCompare(b.name)
            break
          case 'stock':
            cmp = a.stock - b.stock
            break
          case 'min_stock':
            cmp = a.min_stock - b.min_stock
            break
          case 'cost':
            cmp = a.cost - b.cost
            break
          case 'price':
            cmp = a.price - b.price
            break
          case 'stockValue':
            cmp = a.stock * a.cost - b.stock * b.cost
            break
          case 'margin':
            cmp = (a.price - a.cost) - (b.price - b.cost)
            break
        }
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [products, searchTerm, statusFilter, supplierFilter, sortField, sortDir])

  const stats = useMemo(() => {
    const totalValue = products.reduce((s, p) => s + p.stock * p.cost, 0)
    const totalPrice = products.reduce((s, p) => s + p.stock * p.price, 0)
    const lowStock = products.filter((p) => p.stock <= p.min_stock && p.stock > 0).length
    const outOfStock = products.filter((p) => p.stock === 0).length
    const totalCost = products.reduce((s, p) => s + p.cost, 0)
    const avgMargin = products.length > 0
      ? products.reduce((s, p) => s + (p.price - p.cost), 0) / products.length
      : 0
    return { totalValue, totalPrice, lowStock, outOfStock, avgMargin }
  }, [products])

  const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const SortHeader = ({ field, label, className }: { field: SortField; label: string; className?: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`inline-flex items-center gap-1 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider hover:text-[var(--ink)] transition-colors cursor-pointer ${className || ''}`}
    >
      {label}
      {sortField === field ? (
        sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
      ) : (
        <ChevronUp size={12} className="opacity-0 group-hover:opacity-30" />
      )}
    </button>
  )

  const handleQuickEntry = async (e: React.FormEvent) => {
    e.preventDefault()
    setEntryError('')
    if (entryQuantity === '' || entryQuantity < 1) {
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--ink)]">Productos</h1>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4 animate-pulse">
              <div className="h-3 w-16 bg-[var(--surface-2)] rounded mb-2" />
              <div className="h-6 w-12 bg-[var(--surface-2)] rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-[var(--border-subtle)] last:border-0">
              <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--surface-2)]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 bg-[var(--surface-2)] rounded" />
                <div className="h-2 w-20 bg-[var(--surface-2)] rounded" />
              </div>
              <div className="h-4 w-16 bg-[var(--surface-2)] rounded" />
              <div className="h-4 w-16 bg-[var(--surface-2)] rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Productos</h1>
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
          <h1 className="text-xl font-semibold text-[var(--ink)]">Productos</h1>
          <p className="text-sm text-[var(--ink-tertiary)] mt-0.5">
            {products.length} productos &middot; {filteredProducts.length === products.length ? '' : `${filteredProducts.length} filtrados`}
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
            <span className="text-xs font-medium uppercase tracking-wide">Total Productos</span>
          </div>
          <p className="text-xl font-semibold text-[var(--ink)]">{products.length}</p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
            <DollarSign size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Valor Inventario</span>
          </div>
          <p className="text-xl font-semibold text-[var(--ink)]">{formatCurrency(stats.totalValue)}</p>
          <p className="text-[11px] text-[var(--ink-muted)] mt-0.5">
            Venta: {formatCurrency(stats.totalPrice)}
          </p>
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
          <div className="flex items-center gap-2 text-[var(--danger)] mb-1">
            <Package size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Sin Stock</span>
          </div>
          <p className={`text-xl font-semibold ${stats.outOfStock > 0 ? 'text-[var(--danger)]' : 'text-[var(--ink)]'}`}>
            {stats.outOfStock}
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
              placeholder="Buscar por nombre o SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StockStatus)}
            className="px-2.5 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="available">Disponible</option>
            <option value="low">Stock bajo</option>
            <option value="out">Sin stock</option>
          </select>
          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-2.5 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer"
          >
            <option value="">Todos los proveedores</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filteredProducts.length === 0 ? (
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-8 text-center">
          <Package size={40} className="mx-auto mb-3 text-[var(--ink-muted)]" />
          <p className="text-sm text-[var(--ink-tertiary)]">
            {searchTerm || statusFilter !== 'all' || supplierFilter
              ? 'No hay productos con los filtros actuales'
              : 'No hay productos registrados'}
          </p>
          {!searchTerm && statusFilter === 'all' && !supplierFilter && (
            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} /> Crear primer producto
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/50">
                  <th className="px-4 py-3 text-left group">
                    <SortHeader field="name" label="Producto" />
                  </th>
                  <th className="px-4 py-3 text-center group">
                    <SortHeader field="stock" label="Stock" />
                  </th>
                  <th className="px-4 py-3 text-center hidden sm:table-cell group">
                    <SortHeader field="min_stock" label="Min." />
                  </th>
                  <th className="px-4 py-3 text-right hidden md:table-cell group">
                    <SortHeader field="cost" label="Costo" />
                  </th>
                  <th className="px-4 py-3 text-right hidden md:table-cell group">
                    <SortHeader field="price" label="Venta" />
                  </th>
                  <th className="px-4 py-3 text-right hidden lg:table-cell group">
                    <SortHeader field="stockValue" label="Valor Stock" />
                  </th>
                  <th className="px-4 py-3 text-right hidden lg:table-cell group">
                    <SortHeader field="margin" label="Margen" />
                  </th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">
                    <span className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Proveedor</span>
                  </th>
                  <th className="px-4 py-3 text-center hidden xl:table-cell">
                    <span className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Estado</span>
                  </th>
                  <th className="px-4 py-3 text-right hidden xl:table-cell">
                    <span className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Últ. Mov.</span>
                  </th>
                  <th className="px-4 py-3 w-[40px]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredProducts.map((p) => {
                  const stockValue = p.stock * p.cost
                  const margin = p.price - p.cost
                  const marginPercent = p.price > 0 ? (margin / p.price) * 100 : 0
                  const isLow = p.stock <= p.min_stock && p.stock > 0
                  const isOut = p.stock === 0

                  return (
                    <tr
                      key={p.id}
                      className="group transition-colors hover:bg-[var(--surface-2)]/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-tertiary)] shrink-0 overflow-hidden">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package size={18} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <button
                              onClick={() => router.push(`/inventory/${p.id}`)}
                              className="text-sm font-medium text-[var(--ink)] hover:text-[var(--accent)] transition-colors cursor-pointer text-left truncate block"
                            >
                              {p.name}
                            </button>
                            <span className="text-[11px] text-[var(--ink-muted)] font-mono">{p.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold font-mono ${
                          isOut ? 'text-[var(--danger)]' : isLow ? 'text-[var(--warning)]' : 'text-[var(--ink)]'
                        }`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <span className="text-sm text-[var(--ink-tertiary)] font-mono">{p.min_stock}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="text-sm text-[var(--danger)] font-medium">{formatCurrency(p.cost)}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="text-sm text-[var(--success)] font-medium">{formatCurrency(p.price)}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <span className="text-sm font-semibold text-[var(--ink)]">{formatCurrency(stockValue)}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <span className={`text-sm font-semibold ${margin >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                          {formatCurrency(margin)}
                        </span>
                        <span className={`text-[11px] ml-1 ${marginPercent >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                          ({marginPercent.toFixed(0)}%)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-left hidden lg:table-cell">
                        <span className="text-sm text-[var(--ink-secondary)] truncate block max-w-[120px]">
                          {p.suppliers?.name || <span className="text-[var(--ink-muted)] italic">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden xl:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          isOut
                            ? 'bg-[var(--danger)]/10 text-[var(--danger)]'
                            : isLow
                            ? 'bg-[var(--warning)]/10 text-[var(--warning)]'
                            : 'bg-[var(--success)]/10 text-[var(--success)]'
                        }`}>
                          {isOut ? 'Sin stock' : isLow ? 'Stock bajo' : 'Disponible'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden xl:table-cell">
                        <span className="text-xs text-[var(--ink-muted)] font-mono">
                          {p.lastMovementDate
                            ? new Date(p.lastMovementDate).toLocaleDateString('es-CO', {
                                day: '2-digit',
                                month: '2-digit',
                              })
                            : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => router.push(`/inventory/${p.id}`)}
                          className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-[var(--radius-sm)] transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Ver producto"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--ink-muted)]">
            <span>{filteredProducts.length} productos</span>
            <span>
              Valor total: {formatCurrency(
                filteredProducts.reduce((s, p) => s + p.stock * p.cost, 0)
              )}
            </span>
          </div>
        </div>
      )}

      {/* Low Stock Alerts */}
      {stats.lowStock > 0 && filteredProducts.length > 0 && (
        <div className="rounded-[var(--radius-md)] bg-[var(--warning)]/5 border border-[var(--warning)]/20 p-4">
          <div className="flex items-center gap-2 text-[var(--warning)] mb-2">
            <AlertTriangle size={16} />
            <span className="text-sm font-semibold">Productos con stock bajo</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {products
              .filter((p) => p.stock <= p.min_stock && p.stock > 0)
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
            {products.filter((p) => p.stock <= p.min_stock && p.stock > 0).length > 5 && (
              <span className="text-xs text-[var(--ink-muted)] self-center">
                +{products.filter((p) => p.stock <= p.min_stock && p.stock > 0).length - 5} más
              </span>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateProductModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => { setShowCreateModal(false); fetchData() }}
      />

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
            onChange={(e) => setEntryQuantity(e.target.value === '' ? '' : Number(e.target.value))}
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
