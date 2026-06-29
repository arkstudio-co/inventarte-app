'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useProducts } from '@/hooks/useProducts'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'

import { Modal } from '@/components/ui/Modal'
import { CreateProductModal } from '@/components/inventory/CreateProductModal'
import {
  Plus,
  Search,
  Package,
  Edit,
  Trash2,
} from 'lucide-react'

export default function InventoryPage() {
  const router = useRouter()
  const supabase = createClient()
  const { products, isLoading, refetch } = useProducts()
  const [searchTerm, setSearchTerm] = useState('')
  const [stockFilter, setStockFilter] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null)

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
                <div className="flex items-center flex-1 min-w-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--ink)] truncate">{product.name}</p>
                    <p className="text-xs text-[var(--ink-tertiary)] font-mono truncate mt-0.5">{product.sku}</p>
                  </div>
                  <div className="flex items-center gap-6 justify-center flex-1">
                    <div className="flex flex-col items-center shrink-0">
                      <p className="text-xs text-[var(--ink-tertiary)] uppercase">Costo</p>
                      <p className="text-sm font-semibold text-[var(--danger)]">${product.cost.toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-center shrink-0">
                      <p className="text-xs text-[var(--ink-tertiary)] uppercase">Valor</p>
                      <p className="text-sm font-semibold text-[var(--success)]">${product.price.toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col items-center shrink-0">
                      <p className="text-xs text-[var(--ink-tertiary)] uppercase">Unidades</p>
                      <p className="text-sm font-semibold text-[var(--ink)]">{product.stock.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => router.push(`/inventory/${product.id}?edit=true`)}
                      className="p-2 text-[var(--ink-tertiary)] hover:text-[var(--tint)] hover:bg-[var(--tint-light)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit size={16} />
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
            </div>
          ))
        )}
      </div>

      <CreateProductModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => { setShowCreateModal(false); refetch() }}
      />

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
