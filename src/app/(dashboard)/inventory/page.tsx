'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { EntryStockModal } from '@/components/inventory/EntryStockModal'
import { WithdrawalModal } from '@/components/inventory/WithdrawalModal'


import {
  Plus,
  Search,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Eye,
  Box,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'
import type { Product, Supplier } from '@/types/database'

interface StockProduct {
  id: string
  name: string
  sku: string
  image_url: string | null
  stock: number
  min_stock: number
  price: number
  cost: number
  supplierName: string | null
  supplierId: string | null
  lastMovementDate: string | null
  totalEntries: number
  totalWithdrawals: number
}

type StockSortField = 'name' | 'stock' | 'min_stock' | 'cost' | 'price' | 'stockValue' | 'margin'
type StockSortDir = 'asc' | 'desc'
type StockStatus = 'all' | 'available' | 'low' | 'out'

export default function InventoryDashboardPage() {
  const router = useRouter()
  const supabase = createClient()

  const [products, setProducts] = useState<StockProduct[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [stockSearch, setStockSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StockStatus>('all')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [sortField, setSortField] = useState<StockSortField>('name')
  const [sortDir, setSortDir] = useState<StockSortDir>('asc')

  const [showEntryModal, setShowEntryModal] = useState(false)
  const [withdrawalProduct, setWithdrawalProduct] = useState<string | null>(null)

  const fetchData = async () => {
    setIsLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setIsLoading(false); setError('Debes iniciar sesión'); return }

    const [productsRes, entriesRes, withdrawalsRes, suppliersRes] = await Promise.all([
      supabase.from('products').select('*, suppliers(name)').order('name'),
      supabase.from('stock_entries').select('*, products!inner(name, sku, suppliers(name))').order('created_at', { ascending: false }),
      supabase.from('stock_withdrawals').select('*, products!inner(name, sku)').order('withdrawal_date', { ascending: false }),
      supabase.from('suppliers').select('*').order('name'),
    ])

    if (productsRes.error) { setError(productsRes.error.message); setIsLoading(false); return }

    const productList = (productsRes.data || []) as any[]
    const entriesList = (entriesRes.data || []) as any[]
    const withdrawalsList = (withdrawalsRes.data || []) as any[]

    const entryCounts = new Map<string, { total: number; lastDate: string | null }>()
    for (const e of entriesList) {
      const existing = entryCounts.get(e.product_id)
      if (!existing) entryCounts.set(e.product_id, { total: e.quantity, lastDate: e.created_at })
      else existing.total += e.quantity
    }

    const withdrawalCounts = new Map<string, { total: number; lastDate: string | null }>()
    for (const w of withdrawalsList) {
      const existing = withdrawalCounts.get(w.product_id)
      if (!existing) withdrawalCounts.set(w.product_id, { total: w.quantity, lastDate: w.withdrawal_date })
      else existing.total += w.quantity
    }

    const enrichedProducts: StockProduct[] = productList.map((p: any) => {
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
        id: p.id, name: p.name, sku: p.sku, image_url: p.image_url,
        stock: p.stock, min_stock: p.min_stock, price: p.price, cost: p.cost,
        supplierName: p.suppliers?.name || null, supplierId: p.supplier_id,
        lastMovementDate, totalEntries, totalWithdrawals,
      }
    })

    setProducts(enrichedProducts)
    if (suppliersRes.data) setSuppliers(suppliersRes.data)
    setIsLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const kpiData = useMemo(() => {
    const totalInventoryValue = products.reduce((s, p) => s + p.stock * p.cost, 0)
    const totalSellingValue = products.reduce((s, p) => s + p.stock * p.price, 0)
    const productsWithStock = products.filter((p) => p.stock > 0).length
    const lowStock = products.filter((p) => p.stock <= p.min_stock && p.stock > 0).length
    const outOfStock = products.filter((p) => p.stock === 0).length
    return { totalInventoryValue, totalSellingValue, productsWithStock, lowStock, outOfStock }
  }, [products])



  const filteredStock = useMemo(() => {
    return products
      .filter((p) => {
        if (statusFilter === 'low' && (p.stock > p.min_stock || p.stock === 0)) return false
        if (statusFilter === 'out' && p.stock !== 0) return false
        if (statusFilter === 'available' && p.stock === 0) return false
        if (supplierFilter && p.supplierId !== supplierFilter) return false
        if (stockSearch) {
          const term = stockSearch.toLowerCase()
          if (!p.name.toLowerCase().includes(term) && !p.sku.toLowerCase().includes(term)) return false
        }
        return true
      })
      .sort((a, b) => {
        let cmp = 0
        switch (sortField) {
          case 'name': cmp = a.name.localeCompare(b.name); break
          case 'stock': cmp = a.stock - b.stock; break
          case 'min_stock': cmp = a.min_stock - b.min_stock; break
          case 'cost': cmp = a.cost - b.cost; break
          case 'price': cmp = a.price - b.price; break
          case 'stockValue': cmp = a.stock * a.cost - b.stock * b.cost; break
          case 'margin': cmp = (a.price - a.cost) - (b.price - b.cost); break
        }
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [products, stockSearch, statusFilter, supplierFilter, sortField, sortDir])

  const toggleSort = (field: StockSortField) => {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  const SortHeader = ({ field, label, className }: { field: StockSortField; label: string; className?: string }) => (
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between"><h1 className="text-xl font-semibold text-[var(--ink)]">Inventario</h1></div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4 animate-pulse">
              <div className="h-3 w-20 bg-[var(--surface-2)] rounded mb-2" />
              <div className="h-6 w-16 bg-[var(--surface-2)] rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Inventario</h1>
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
          <h1 className="text-xl font-semibold text-[var(--ink)]">Inventario</h1>
          <p className="text-sm text-[var(--ink-tertiary)] mt-0.5">
            {products.length} productos &middot; {kpiData.totalInventoryValue > 0 ? `${formatCurrency(kpiData.totalInventoryValue)} en stock` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowEntryModal(true)}>
            <Plus size={14} /> Entrada
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setWithdrawalProduct('')}>
            <TrendingDown size={14} /> Salida
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
            <DollarSign size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Valor Inventario</span>
          </div>
          <p className="text-lg font-semibold text-[var(--ink)]">{formatCurrency(kpiData.totalInventoryValue)}</p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
            <TrendingUp size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Valor Venta</span>
          </div>
          <p className="text-lg font-semibold text-[var(--ink)]">{formatCurrency(kpiData.totalSellingValue)}</p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
            <Package size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Con Stock</span>
          </div>
          <p className="text-lg font-semibold text-[var(--ink)]">{kpiData.productsWithStock}/{products.length}</p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--warning)] mb-1">
            <AlertTriangle size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Stock Bajo</span>
          </div>
          <p className={`text-lg font-semibold ${kpiData.lowStock > 0 ? 'text-[var(--warning)]' : 'text-[var(--ink)]'}`}>
            {kpiData.lowStock}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--danger)] mb-1">
            <Box size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Sin Stock</span>
          </div>
          <p className={`text-lg font-semibold ${kpiData.outOfStock > 0 ? 'text-[var(--danger)]' : 'text-[var(--ink)]'}`}>
            {kpiData.outOfStock}
          </p>
        </div>
      </div>

      {/* Stock Table */}
      <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Productos en Inventario</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)]" />
              <input
                className="w-48 pl-8 pr-2.5 py-1.5 text-xs rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                placeholder="Buscar producto..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StockStatus)}
              className="px-2 py-1.5 text-xs rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer"
            >
              <option value="all">Todos</option>
              <option value="available">Disponible</option>
              <option value="low">Stock bajo</option>
              <option value="out">Sin stock</option>
            </select>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="px-2 py-1.5 text-xs rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer"
            >
              <option value="">Proveedor</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/50">
                <th className="px-4 py-3 text-left group"><SortHeader field="name" label="Producto" /></th>
                <th className="px-4 py-3 text-center group"><SortHeader field="stock" label="Stock" /></th>
                <th className="px-4 py-3 text-center hidden sm:table-cell group"><SortHeader field="min_stock" label="Min." /></th>
                <th className="px-4 py-3 text-right hidden md:table-cell group"><SortHeader field="cost" label="Costo" /></th>
                <th className="px-4 py-3 text-right hidden md:table-cell group"><SortHeader field="price" label="Venta" /></th>
                <th className="px-4 py-3 text-right hidden lg:table-cell group"><SortHeader field="stockValue" label="Valor" /></th>
                <th className="px-4 py-3 text-right hidden lg:table-cell group"><SortHeader field="margin" label="Margen" /></th>
                <th className="px-4 py-3 text-center"><span className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Estado</span></th>
                <th className="px-4 py-3 text-right hidden xl:table-cell"><span className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Últ. Mov.</span></th>
                <th className="px-4 py-3 w-[56px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-[var(--ink-muted)]">No hay productos con los filtros actuales</td>
                </tr>
              ) : (
                filteredStock.map((p) => {
                  const stockValue = p.stock * p.cost
                  const margin = p.price - p.cost
                  const marginPercent = p.price > 0 ? (margin / p.price) * 100 : 0
                  const isLow = p.stock <= p.min_stock && p.stock > 0
                  const isOut = p.stock === 0
                  return (
                    <tr key={p.id} className="group transition-colors hover:bg-[var(--surface-2)]/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-tertiary)] shrink-0 overflow-hidden">
                            {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <Package size={16} />}
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm font-medium text-[var(--ink)]">{p.name}</span>
                            <span className="text-[11px] text-[var(--ink-muted)] font-mono block">{p.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-bold font-mono ${isOut ? 'text-[var(--danger)]' : isLow ? 'text-[var(--warning)]' : 'text-[var(--ink)]'}`}>{p.stock}</span>
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
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          isOut ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : isLow ? 'bg-[var(--warning)]/10 text-[var(--warning)]' : 'bg-[var(--success)]/10 text-[var(--success)]'
                        }`}>
                          {isOut ? 'Sin stock' : isLow ? 'Stock bajo' : 'Disponible'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right hidden xl:table-cell">
                        <span className="text-xs text-[var(--ink-muted)] font-mono">
                          {p.lastMovementDate
                            ? new Date(p.lastMovementDate).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit' })
                            : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => router.push(`/products/${p.id}`)}
                            className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                            title="Ver producto"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => setWithdrawalProduct(p.id)}
                            className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                            title="Registrar salida"
                          >
                            <TrendingDown size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--ink-muted)]">
          <span>{filteredStock.length} de {products.length} productos</span>
        </div>
      </div>

      {/* Low Stock Alert */}
      {kpiData.lowStock > 0 && (
        <div className="rounded-[var(--radius-md)] bg-[var(--warning)]/5 border border-[var(--warning)]/20 p-4">
          <div className="flex items-center gap-2 text-[var(--warning)] mb-2">
            <AlertTriangle size={16} />
            <span className="text-sm font-semibold">Productos con stock bajo</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {products.filter((p) => p.stock <= p.min_stock && p.stock > 0).slice(0, 5).map((p) => (
              <button
                key={p.id}
                onClick={() => router.push(`/products/${p.id}`)}
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

      {/* Entry Modal */}
      <EntryStockModal
        isOpen={showEntryModal}
        onClose={() => setShowEntryModal(false)}
        onSuccess={fetchData}
        products={products.map((p) => ({ id: p.id, name: p.name, sku: p.sku, stock: p.stock, cost: p.cost }))}
      />

      {/* Withdrawal Modal */}
      {withdrawalProduct !== null && (
        <WithdrawalModal
          productId={withdrawalProduct}
          onClose={() => setWithdrawalProduct(null)}
          onSuccess={() => { setWithdrawalProduct(null); fetchData() }}
        />
      )}
    </div>
  )
}
