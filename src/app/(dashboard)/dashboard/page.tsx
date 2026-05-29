'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/types/database'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Search, Package, DollarSign, AlertTriangle, TrendingUp, Users } from 'lucide-react'

function KpiCard({
  title,
  value,
  icon: Icon,
  variant = 'default',
}: {
  title: string
  value: string
  icon: any
  variant?: 'default' | 'warning' | 'danger' | 'success'
}) {
  const borderColors = {
    default: 'border-[var(--border-default)]',
    warning: 'border-[var(--warning)]/30',
    danger: 'border-[var(--danger)]/30',
    success: 'border-[var(--success)]/30',
  }

  const iconBg = {
    default: 'bg-[var(--tint-light)] text-[var(--tint)]',
    warning: 'bg-[var(--warning-light)] text-[var(--warning)]',
    danger: 'bg-[var(--danger-light)] text-[var(--danger)]',
    success: 'bg-[var(--success-light)] text-[var(--success)]',
  }

  return (
    <div className={`rounded-[var(--radius-md)] bg-[var(--surface-1)] border ${borderColors[variant]} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-[var(--ink-tertiary)] uppercase tracking-wide">{title}</span>
        <div className={`w-8 h-8 rounded-[var(--radius-sm)] ${iconBg[variant]} flex items-center justify-center`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-2xl font-semibold text-[var(--ink)]">{value}</p>
    </div>
  )
}

export default function DashboardPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [monthlySales, setMonthlySales] = useState(0)
  const [sellerDebt, setSellerDebt] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [gramajeMin, setGramajeMin] = useState('')
  const [gramajeMax, setGramajeMax] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: products }, { data: suppliers }, { data: withdrawals }] = await Promise.all([
        supabase.from('products').select('*, suppliers(*)'),
        supabase.from('suppliers').select('id, name'),
        supabase.from('stock_withdrawals').select('delivery_type, pending_amount, created_at'),
      ])

      if (products) setProducts(products)
      if (suppliers) setSuppliers(suppliers)

      if (withdrawals) {
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        const monthlyPaid = withdrawals
          .filter((w) => w.delivery_type === 'paid' && w.created_at >= startOfMonth)
          .reduce((sum, w) => sum + (w.pending_amount || 0), 0)

        const debt = withdrawals
          .filter((w) => w.delivery_type === 'pending')
          .reduce((sum, w) => sum + (w.pending_amount || 0), 0)

        setMonthlySales(monthlyPaid)
        setSellerDebt(debt)
      }
    }
    fetchData()
  }, [])

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = !searchTerm || 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.price.toString().includes(searchTerm)

      const matchesPrice = 
        (!priceMin || p.price >= Number(priceMin)) &&
        (!priceMax || p.price <= Number(priceMax))

      const matchesGramaje = 
        (!gramajeMin || (p.gramaje && p.gramaje >= Number(gramajeMin))) &&
        (!gramajeMax || (p.gramaje && p.gramaje <= Number(gramajeMax)))

      const matchesStock = !stockFilter || 
        (stockFilter === 'low' && p.stock <= p.min_stock) ||
        (stockFilter === 'out' && p.stock === 0) ||
        (stockFilter === 'available' && p.stock > 0)

      const matchesAvailability = !availabilityFilter ||
        (availabilityFilter === 'active' && p.is_active) ||
        (availabilityFilter === 'inactive' && !p.is_active)

      const matchesSupplier = !supplierFilter || p.supplier_id === supplierFilter

      return matchesSearch && matchesPrice && matchesGramaje && matchesStock && matchesAvailability && matchesSupplier
    })
  }, [products, searchTerm, priceMin, priceMax, gramajeMin, gramajeMax, stockFilter, availabilityFilter, supplierFilter])

  const totalValue = useMemo(() =>
    products.reduce((sum, p) => sum + p.price * p.stock, 0),
    [products]
  )

  const lowStockProducts = useMemo(() =>
    products.filter((p) => p.stock <= p.min_stock),
    [products]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total Productos"
          value={products.length.toString()}
          icon={Package}
          variant="default"
        />
        <KpiCard
          title="Valor Inventario"
          value={`$${totalValue.toLocaleString()}`}
          icon={DollarSign}
          variant="success"
        />
        <KpiCard
          title="Stock Bajo"
          value={lowStockProducts.length.toString()}
          icon={AlertTriangle}
          variant={lowStockProducts.length > 0 ? 'danger' : 'default'}
        />
        <KpiCard
          title="Ventas del Mes"
          value={`$${monthlySales.toLocaleString()}`}
          icon={TrendingUp}
          variant={monthlySales > 0 ? 'success' : 'default'}
        />
        <KpiCard
          title="Deuda Vendedores"
          value={`$${sellerDebt.toLocaleString()}`}
          icon={Users}
          variant={sellerDebt > 0 ? 'warning' : 'default'}
        />
      </div>

      <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Search size={16} className="text-[var(--ink-tertiary)]" />
          <h2 className="text-sm font-semibold text-[var(--ink)]">Buscador de Productos</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)]" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="Buscar por nombre, SKU, precio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Input placeholder="Precio min" type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
          <Input placeholder="Precio max" type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
          <Select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Filtrar proveedor"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input placeholder="Gramaje min" type="number" value={gramajeMin} onChange={(e) => setGramajeMin(e.target.value)} />
          <Input placeholder="Gramaje max" type="number" value={gramajeMax} onChange={(e) => setGramajeMax(e.target.value)} />
          <Select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            options={[
              { value: 'low', label: 'Stock bajo' },
              { value: 'out', label: 'Sin stock' },
              { value: 'available', label: 'Disponible' },
            ]}
            placeholder="Filtrar stock"
          />
          <Select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            options={[
              { value: 'active', label: 'Activo' },
              { value: 'inactive', label: 'Inactivo' },
            ]}
            placeholder="Disponibilidad"
          />
        </div>
      </div>

      <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden">
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <h3 className="text-sm font-semibold text-[var(--ink)]">
            Resultados ({filteredProducts.length})
          </h3>
        </div>
        <div className="divide-y divide-[var(--border-subtle)]">
          {filteredProducts.length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--ink-tertiary)]">
              No se encontraron productos
            </div>
          ) : (
            filteredProducts.slice(0, 10).map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4 hover:bg-[var(--surface-2)]/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--surface-2)] flex items-center justify-center text-xs text-[var(--ink-tertiary)] shrink-0 overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package size={18} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--ink)] truncate">{p.name}</p>
                    <p className="text-xs text-[var(--ink-tertiary)] font-mono">{p.sku}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm font-mono text-[var(--ink-secondary)]">${p.price.toLocaleString()}</span>
                  <Badge variant={p.stock <= p.min_stock ? 'danger' : p.stock === 0 ? 'warning' : 'success'}>
                    {p.stock} uds
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
