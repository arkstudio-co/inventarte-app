'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { CreateProductModal } from '@/components/inventory/CreateProductModal'

import {
  Search,
  Package,
  AlertTriangle,
  Eye,
  Plus,
  DollarSign,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Ruler,
} from 'lucide-react'
import type { Product } from '@/types/database'

interface ProductListItem extends Product {
  supplierName: string | null
}

type SortField = 'name' | 'cost' | 'price' | 'margin'
type SortDir = 'asc' | 'desc'

export default function ProductsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [products, setProducts] = useState<ProductListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setIsLoading(false)
      setError('Debes iniciar sesión')
      return
    }

    const [productsRes, suppliersRes] = await Promise.all([
      supabase.from('products').select('*, suppliers(name)').order('name'),
      supabase.from('suppliers').select('id, name').order('name'),
    ])

    if (productsRes.error) {
      setError(productsRes.error.message)
      setIsLoading(false)
      return
    }

    const enriched: ProductListItem[] = (productsRes.data || []).map((p: any) => ({
      ...p,
      supplierName: p.suppliers?.name || null,
    }))

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
          case 'cost':
            cmp = a.cost - b.cost
            break
          case 'price':
            cmp = a.price - b.price
            break
          case 'margin':
            cmp = (a.price - a.cost) - (b.price - b.cost)
            break
        }
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [products, searchTerm, supplierFilter, sortField, sortDir])

  const stats = useMemo(() => {
    const avgPrice = products.length > 0
      ? products.reduce((s, p) => s + p.price, 0) / products.length
      : 0
    const avgCost = products.length > 0
      ? products.reduce((s, p) => s + p.cost, 0) / products.length
      : 0
    return { avgPrice, avgCost }
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--ink)]">Productos</h1>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Package size={14} /> Producto
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
            <Package size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Total Productos</span>
          </div>
          <p className="text-xl font-semibold text-[var(--ink)]">{products.length}</p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
            <DollarSign size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Precio Promedio</span>
          </div>
          <p className="text-xl font-semibold text-[var(--ink)]">{formatCurrency(Math.round(stats.avgPrice))}</p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
            <DollarSign size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Costo Promedio</span>
          </div>
          <p className="text-xl font-semibold text-[var(--ink)]">{formatCurrency(Math.round(stats.avgCost))}</p>
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
            {searchTerm || supplierFilter
              ? 'No hay productos con los filtros actuales'
              : 'No hay productos registrados'}
          </p>
          {!searchTerm && !supplierFilter && (
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
                  <th className="px-4 py-3 text-right hidden md:table-cell group">
                    <SortHeader field="cost" label="Costo" />
                  </th>
                  <th className="px-4 py-3 text-right hidden md:table-cell group">
                    <SortHeader field="price" label="Venta" />
                  </th>
                  <th className="px-4 py-3 text-right hidden lg:table-cell group">
                    <SortHeader field="margin" label="Margen" />
                  </th>
                  <th className="px-4 py-3 text-center hidden lg:table-cell">
                    <span className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Gramaje</span>
                  </th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">
                    <span className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Proveedor</span>
                  </th>
                  <th className="px-4 py-3 w-[40px]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredProducts.map((p) => {
                  const margin = p.price - p.cost
                  const marginPercent = p.price > 0 ? (margin / p.price) * 100 : 0

                  return (
                    <tr
                      key={p.id}
                      className="group transition-colors hover:bg-[var(--surface-2)]/30 cursor-pointer"
                      onClick={() => router.push(`/products/${p.id}`)}
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
                            <span className="text-sm font-medium text-[var(--ink)]">
                              {p.name}
                            </span>
                            <span className="text-[11px] text-[var(--ink-muted)] font-mono block">{p.sku}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="text-sm text-[var(--danger)] font-medium">{formatCurrency(p.cost)}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="text-sm text-[var(--success)] font-medium">{formatCurrency(p.price)}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <span className={`text-sm font-semibold ${margin >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                          {formatCurrency(margin)}
                        </span>
                        <span className={`text-[11px] ml-1 ${marginPercent >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                          ({marginPercent.toFixed(0)}%)
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        <span className="inline-flex items-center gap-1 text-sm text-[var(--ink-secondary)]">
                          <Ruler size={12} className="text-[var(--ink-muted)]" />
                          {p.gramaje ? `${p.gramaje}g` : <span className="text-[var(--ink-muted)] italic">&mdash;</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-left hidden lg:table-cell">
                        <span className="text-sm text-[var(--ink-secondary)] truncate block max-w-[120px]">
                          {p.supplierName || <span className="text-[var(--ink-muted)] italic">—</span>}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/products/${p.id}`) }}
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
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateProductModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => { setShowCreateModal(false); fetchData() }}
      />
    </div>
  )
}
