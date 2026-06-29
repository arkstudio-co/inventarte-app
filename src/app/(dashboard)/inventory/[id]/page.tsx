'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { productSchema, type ProductFormData } from '@/lib/validations/product'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { ArrowLeft, Package, Edit2, Plus } from 'lucide-react'
import type { Product, Supplier } from '@/types/database'

export default function ProductDetailPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const isEditing = searchParams.get('edit') === 'true'

  const [product, setProduct] = useState<Product | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [showStockEntry, setShowStockEntry] = useState(false)
  const [entryQuantity, setEntryQuantity] = useState(1)
  const [entryObservations, setEntryObservations] = useState('')
  const [entryPaymentStatus, setEntryPaymentStatus] = useState<'paid' | 'pending'>('pending')
  const [isAddingStock, setIsAddingStock] = useState(false)
  const [showInlineAddStock, setShowInlineAddStock] = useState(false)
  const [inlineAddQty, setInlineAddQty] = useState(1)
  const [suggestedPrice, setSuggestedPrice] = useState('')

  const handleInlineAddStock = async () => {
    if (inlineAddQty < 1) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('stock_entries').insert({
      product_id: params.id,
      quantity: inlineAddQty,
      payment_status: 'pending',
      observations: 'Añadido desde edición',
      created_by: user.id,
    })
    await supabase.rpc('increment_stock', {
      p_product_id: params.id,
      p_quantity: inlineAddQty,
    })
    setForm((prev) => ({ ...prev, stock: prev.stock + inlineAddQty }))
    setShowInlineAddStock(false)
    setInlineAddQty(1)
  }

  const [form, setForm] = useState<ProductFormData>({
    name: '',
    description: '',
    stock: 0,
    min_stock: 0,
    price: 0,
    cost: 0,
    gramaje: '',
    supplier_id: '',
    image_url: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      const { data: product } = await supabase
        .from('products')
        .select('*, suppliers(*)')
        .eq('id', params.id)
        .single()

      if (product) {
        setProduct(product as any)
        setForm({
          name: product.name,
          description: product.description || '',
          stock: product.stock,
          min_stock: product.min_stock,
          price: product.price,
          cost: product.cost,
          gramaje: product.gramaje?.toString() || '',
          supplier_id: product.supplier_id || '',
          image_url: product.image_url || '',
        })
        setSuggestedPrice((product as any).suggested_price?.toString() || '')
      }

      const { data: suppliers } = await supabase.from('suppliers').select('*')
      if (suppliers) setSuppliers(suppliers)

      setIsLoading(false)
    }
    fetchData()
  }, [params.id])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = productSchema.safeParse(form)
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    setIsSaving(true)
      const { error: updateError } = await supabase
        .from('products')
        .update({
          name: form.name,
          description: form.description || null,
          stock: form.stock,
          min_stock: form.min_stock,
          price: form.price,
          cost: form.cost,
          suggested_price: suggestedPrice ? Number(suggestedPrice) : null,
          gramaje: form.gramaje ? Number(form.gramaje) : null,
          supplier_id: form.supplier_id || null,
          image_url: form.image_url || null,
        })
        .eq('id', params.id)

    if (updateError) {
      setError(updateError.message)
      setIsSaving(false)
      return
    }

    router.push('/inventory')
  }

  if (isLoading) {
    return <div className="animate-pulse text-sm text-[var(--ink-tertiary)]">Cargando...</div>
  }

  if (!product) {
    return <div className="text-sm text-[var(--danger)]">Producto no encontrado</div>
  }

  if (isEditing) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 text-[var(--ink-tertiary)] hover:text-[var(--ink)] hover:bg-[var(--surface-1)] rounded-[var(--radius-sm)] transition-colors cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold text-[var(--ink)]">Editar Producto</h1>
        </div>

        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-6">
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              id="name"
              label="Nombre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <p className="text-xs text-[var(--ink-tertiary)] font-mono">{product.sku}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--ink-secondary)]">Stock</label>
                  <button
                    type="button"
                    onClick={() => setShowInlineAddStock(true)}
                    className="w-6 h-6 flex items-center justify-center text-white bg-[var(--accent)] hover:opacity-90 rounded-[var(--radius-sm)] transition-opacity cursor-pointer"
                    title="Añadir stock"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <p className="text-sm font-semibold text-[var(--ink)]">{form.stock}</p>
                {showInlineAddStock && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={inlineAddQty}
                      onChange={(e) => setInlineAddQty(Number(e.target.value))}
                      className="w-20 px-2 py-1 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleInlineAddStock}
                      className="flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-[var(--accent)] rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      ✓
                    </button>
                  </div>
                )}
              </div>
              <Input label="Stock mínimo" type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input label="Precio producción" type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} required />
              <Input label="Precio venta vendedores" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
            </div>

            <Input
              label="Precio sugerido mercado (opcional)"
              type="number"
              step="0.01"
              value={suggestedPrice}
              onChange={(e) => setSuggestedPrice(e.target.value === '' ? '' : e.target.value)}
            />

            <Select
              label="Proveedor"
              value={form.supplier_id || ''}
              onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
              options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
              placeholder="Seleccionar"
            />

            <Input label="Gramaje (g)" type="number" step="0.01" value={form.gramaje ?? ''} onChange={(e) => setForm({ ...form, gramaje: e.target.value === '' ? '' : Number(e.target.value) })} />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--ink-secondary)]">Observación</label>
              <textarea
                className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
                rows={3}
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {error && <div className="text-sm text-[var(--danger)] bg-[var(--danger-light)] px-3 py-2 rounded-[var(--radius-sm)]">{error}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => router.back()}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</Button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 text-[var(--ink-tertiary)] hover:text-[var(--ink)] hover:bg-[var(--surface-1)] rounded-[var(--radius-sm)] transition-colors cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-semibold text-[var(--ink)]">Detalles del Producto</h1>
        <button
          onClick={() => router.push(`/inventory/${product.id}?edit=true`)}
          className="ml-auto p-2 text-[var(--ink-tertiary)] hover:text-[var(--tint)] hover:bg-[var(--tint-light)] rounded-[var(--radius-sm)] transition-colors cursor-pointer"
        >
          <Edit2 size={16} />
        </button>
      </div>

      <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden">
        <div className="aspect-video bg-[var(--surface-2)] flex items-center justify-center">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <Package size={48} className="text-[var(--ink-muted)]" />
          )}
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--ink)]">{product.name}</h2>
            <p className="text-sm font-mono text-[var(--ink-tertiary)]">{product.sku}</p>
          </div>

          {product.description && (
            <p className="text-sm text-[var(--ink-secondary)]">{product.description}</p>
          )}

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--border-subtle)]">
            <div>
              <label className="text-xs font-medium text-[var(--ink-tertiary)] uppercase">Stock</label>
              <p className="text-lg font-semibold text-[var(--ink)]">{product.stock}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--ink-tertiary)] uppercase">Stock Mínimo</label>
              <p className="text-lg font-semibold text-[var(--ink)]">{product.min_stock}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--ink-tertiary)] uppercase">Precio</label>
              <p className="text-lg font-semibold text-[var(--ink)]">${product.price.toLocaleString()}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--ink-tertiary)] uppercase">Costo</label>
              <p className="text-lg font-semibold text-[var(--ink)]">${product.cost.toLocaleString()}</p>
            </div>
            {(product as any).suggested_price && (
              <div>
                <label className="text-xs font-medium text-[var(--ink-tertiary)] uppercase">Precio Sugerido</label>
                <p className="text-lg font-semibold text-[var(--ink)]">${(product as any).suggested_price.toLocaleString()}</p>
              </div>
            )}
            {product.gramaje && (
              <div>
                <label className="text-xs font-medium text-[var(--ink-tertiary)] uppercase">Gramaje</label>
                <p className="text-lg font-semibold text-[var(--ink)]">{product.gramaje}g</p>
              </div>
            )}
          </div>

          {product.suppliers && (
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <label className="text-xs font-medium text-[var(--ink-tertiary)] uppercase">Proveedor</label>
              <p className="text-sm text-[var(--ink)]">{product.suppliers.name}</p>
            </div>
          )}

          <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <Badge variant={product.stock <= product.min_stock ? 'danger' : product.stock === 0 ? 'warning' : 'success'}>
              {product.stock <= product.min_stock ? 'Stock Bajo' : product.stock === 0 ? 'Sin Stock' : 'Disponible'}
            </Badge>
            <Button variant="secondary" size="sm" onClick={() => setShowStockEntry(true)}>
              <Plus size={14} /> Añadir Stock
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={showStockEntry}
        onClose={() => setShowStockEntry(false)}
        title="Añadir Stock"
      >
        <form onSubmit={async (e) => {
          e.preventDefault()
          if (entryQuantity < 1) return
          setIsAddingStock(true)
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) { setIsAddingStock(false); return }
          await supabase.from('stock_entries').insert({
            product_id: product.id,
            quantity: entryQuantity,
            payment_status: entryPaymentStatus,
            observations: entryObservations || null,
            created_by: user.id,
          })
          await supabase.rpc('increment_stock', {
            p_product_id: product.id,
            p_quantity: entryQuantity,
          })
          setIsAddingStock(false)
          setShowStockEntry(false)
          router.refresh()
        }} className="space-y-4">
          <p className="text-sm text-[var(--ink-secondary)]">
            Añadiendo stock a: <strong>{product.name}</strong>
          </p>
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
            <Button type="button" variant="secondary" onClick={() => { setShowStockEntry(false); setEntryPaymentStatus('pending') }}>Cancelar</Button>
            <Button type="submit" disabled={isAddingStock}>
              {isAddingStock ? 'Añadiendo...' : 'Añadir Stock'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
