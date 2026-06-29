'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProducts } from '@/hooks/useProducts'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { WithdrawalModal } from '@/components/inventory/WithdrawalModal'
import { CreateProductModal } from '@/components/inventory/CreateProductModal'
import {
  Plus,
  Search,
  Package,
  Eye,
  Edit,
  Trash2,
  ShoppingCart,
  PackagePlus,
} from 'lucide-react'

export default function InventoryPage() {
  const router = useRouter()
  const supabase = createClient()
  const { products, isLoading, refetch } = useProducts()
  const [searchTerm, setSearchTerm] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null)
  const [withdrawalProduct, setWithdrawalProduct] = useState<string | null>(null)
  const [stockEntryProduct, setStockEntryProduct] = useState<{ id: string; name: string; stock: number } | null>(null)
  const [entryQuantity, setEntryQuantity] = useState(1)
  const [entryObservations, setEntryObservations] = useState('')
  const [entryPaymentStatus, setEntryPaymentStatus] = useState<'paid' | 'pending'>('pending')
  const [isAddingStock, setIsAddingStock] = useState(false)

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.price.toString().includes(searchTerm)

      const matchesStock = !stockFilter ||
        (stockFilter === 'low' && p.stock <= p.min_stock) ||
        (stockFilter === 'out' && p.stock === 0) ||
        (stockFilter === 'available' && p.stock > 0)

      return matchesSearch && matchesStock
    })
  }, [products, searchTerm, stockFilter])

  const handleDelete = async () => {
    if (!deleteModal) return
    await supabase.from('products').delete().eq('id', deleteModal.id)
    setDeleteModal(null)
    refetch()
  }

  const handleStockEntry = async () => {
    if (!stockEntryProduct || entryQuantity < 1) return
    setIsAddingStock(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('stock_entries').insert({
        product_id: stockEntryProduct.id,
        quantity: entryQuantity,
        payment_status: entryPaymentStatus,
        observations: entryObservations || null,
        created_by: user.id,
      })
      await supabase.rpc('increment_stock', {
        p_product_id: stockEntryProduct.id,
        p_quantity: entryQuantity,
      })
    }
    setIsAddingStock(false)
    setStockEntryProduct(null)
    setEntryQuantity(1)
    setEntryObservations('')
    setEntryPaymentStatus('pending')
    refetch()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-sm text-[var(--ink-tertiary)]">Cargando productos...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Inventario</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={16} />
          Crear Producto
        </Button>
      </div>

      <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)]" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="Buscar por nombre, SKU, precio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
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
        </div>
      </div>

      <div className="space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-8 text-center">
            <Package size={40} className="mx-auto mb-3 text-[var(--ink-muted)]" />
            <p className="text-sm text-[var(--ink-tertiary)]">No hay productos registrados</p>
            <Button variant="secondary" className="mt-4" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} /> Crear primer producto
            </Button>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4 hover:bg-[var(--surface-2)]/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-[var(--radius-sm)] bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-tertiary)] shrink-0 overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={24} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-[var(--ink)] truncate">{product.name}</h3>
                    <Badge variant={product.stock <= product.min_stock ? 'danger' : product.stock === 0 ? 'warning' : 'success'}>
                      {product.stock} uds
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-[var(--ink-tertiary)]">
                    <span className="font-mono">{product.sku}</span>
                    <span className="text-[var(--danger)]">C: ${product.cost.toLocaleString()}</span>
                    <span className="text-[var(--success)]">V: ${product.price.toLocaleString()}</span>
                    {product.gramaje && <span>{product.gramaje}g</span>}
                    {product.suppliers && <span>{product.suppliers.name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => router.push(`/inventory/${product.id}`)}
                    className="p-2 text-[var(--ink-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                    title="Ver detalles"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => router.push(`/inventory/${product.id}?edit=true`)}
                    className="p-2 text-[var(--ink-tertiary)] hover:text-[var(--tint)] hover:bg-[var(--tint-light)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => setStockEntryProduct({ id: product.id, name: product.name, stock: product.stock })}
                    className="p-2 text-[var(--ink-tertiary)] hover:text-[var(--tint)] hover:bg-[var(--tint-light)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                    title="Añadir stock"
                  >
                    <PackagePlus size={16} />
                  </button>
                  <button
                    onClick={() => setWithdrawalProduct(product.id)}
                    className="p-2 text-[var(--ink-tertiary)] hover:text-[var(--success)] hover:bg-[var(--success-light)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                    title="Retiro de stock"
                  >
                    <ShoppingCart size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteModal({ id: product.id, name: product.name })}
                    className="p-2 text-[var(--ink-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <CreateProductModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => { setShowCreateModal(false); refetch() }}
      />

      {withdrawalProduct && (
        <WithdrawalModal
          productId={withdrawalProduct}
          onClose={() => setWithdrawalProduct(null)}
          onSuccess={() => { setWithdrawalProduct(null); refetch() }}
        />
      )}

      <Modal
        isOpen={!!stockEntryProduct}
        onClose={() => { setStockEntryProduct(null); setEntryQuantity(1); setEntryObservations('') }}
        title="Añadir Stock"
      >
        <form onSubmit={(e) => { e.preventDefault(); handleStockEntry() }} className="space-y-4">
          {stockEntryProduct && (
            <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-0)] border border-[var(--border-subtle)]">
              <p className="text-sm font-medium text-[var(--ink)]">{stockEntryProduct.name}</p>
              <p className="text-xs text-[var(--ink-tertiary)]">Stock actual: {stockEntryProduct.stock} uds</p>
            </div>
          )}
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
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setStockEntryProduct(null); setEntryQuantity(1); setEntryObservations(''); setEntryPaymentStatus('pending') }}>Cancelar</Button>
            <Button type="submit" disabled={isAddingStock}>
              {isAddingStock ? 'Añadiendo...' : 'Añadir Stock'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Eliminar Producto"
      >
        <p className="text-sm text-[var(--ink-secondary)] mb-4">
          ¿Estás seguro de eliminar <strong>{deleteModal?.name}</strong>? Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleteModal(null)}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}
