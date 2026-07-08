'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { withdrawalSchema } from '@/lib/validations/withdrawal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import type { Product, Supplier } from '@/types/database'

const REASONS = [
  { value: '', label: 'Seleccionar motivo' },
  { value: 'defectuoso', label: 'Producto defectuoso' },
  { value: 'error_inventario', label: 'Error de inventario' },
  { value: 'vencido', label: 'Producto vencido' },
  { value: 'devolucion_proveedor', label: 'Devolución al proveedor' },
  { value: 'otro', label: 'Otro' },
]

interface WithdrawalModalProps {
  productId: string
  onClose: () => void
  onSuccess: () => void
}

export function WithdrawalModal({ productId, onClose, onSuccess }: WithdrawalModalProps) {
  const supabase = createClient()
  const [product, setProduct] = useState<Product | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState(productId || '')

  const [quantity, setQuantity] = useState<number | ''>(1)
  const [reason, setReason] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [observations, setObservations] = useState('')

  useEffect(() => {
    const load = async () => {
      const [suppliersRes, productsRes] = await Promise.all([
        supabase.from('suppliers').select('*').order('name'),
        productId
          ? supabase.from('products').select('*').eq('id', productId).single()
          : supabase.from('products').select('*').eq('is_active', true).order('name'),
      ])

      if (suppliersRes.data) setSuppliers(suppliersRes.data)
      if (productId && productsRes.data) {
        setProduct(productsRes.data as Product)
      } else if (!productId && productsRes.data) {
        setProducts(productsRes.data as Product[])
      }
    }

    load()
  }, [productId])

  const handleProductChange = (id: string) => {
    setSelectedProductId(id)
    const prod = products.find((p) => p.id === id)
    if (prod) setProduct(prod)
  }

  const qty = quantity === '' ? 0 : quantity
  const withdrawalValue = product && qty > 0 ? qty * product.cost : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedProductId && !productId) {
      setError('Debes seleccionar un producto')
      return
    }

    if (product && qty > product.stock) {
      setError(`Solo hay ${product.stock} unidades disponibles`)
      return
    }

    const result = withdrawalSchema.safeParse({
      product_id: selectedProductId || productId,
      quantity: qty,
      reason,
      supplier_id: reason === 'devolucion_proveedor' ? supplierId || undefined : undefined,
      observations,
    })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    setIsLoading(true)

    const res = await fetch('/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result.data),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Error al procesar el retiro')
      setIsLoading(false)
      return
    }

    onSuccess()
  }

  return (
    <Modal isOpen onClose={onClose} title="Retiro de Stock">
      <form onSubmit={handleSubmit} className="space-y-4">
        {productId && product ? (
          <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-0)] border border-[var(--border-subtle)]">
            <p className="text-sm font-medium text-[var(--ink)]">{product.name}</p>
            <p className="text-xs text-[var(--ink-tertiary)]">Stock actual: {product.stock} uds</p>
          </div>
        ) : (
          <Select
            label="Producto"
            value={selectedProductId}
            onChange={(e) => handleProductChange(e.target.value)}
            options={products
              .filter((p) => p.stock > 0)
              .map((p) => ({
                value: p.id,
                label: `${p.name} (${p.sku}) — Stock: ${p.stock} uds`,
              }))}
            placeholder="Seleccionar producto"
          />
        )}

        <Input
          id="quantity"
          label="Cantidad"
          type="number"
          min={1}
          max={product?.stock || 1}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
          required
        />

        {product && qty > product.stock && (
          <p className="text-xs text-[var(--danger)]">La cantidad supera el stock disponible ({product.stock} uds)</p>
        )}

        {product && qty > 0 && qty <= product.stock && (
          <div className="rounded-[var(--radius-sm)] bg-[var(--primary-light)] border border-[var(--primary)]/20 p-3">
            <p className="text-xs text-[var(--ink-tertiary)] uppercase tracking-wide font-semibold">Valor del retiro</p>
            <p className="text-sm font-bold text-[var(--primary)]">{qty} × ${product.cost?.toLocaleString('es-CO') || '0'} = ${withdrawalValue.toLocaleString('es-CO')}</p>
          </div>
        )}

        <Select
          id="reason"
          label="Motivo del retiro"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          options={REASONS.map((r) => ({ value: r.value, label: r.label }))}
          placeholder="Seleccionar motivo"
        />

        {reason === 'devolucion_proveedor' && (
          <Select
            id="supplier"
            label="Proveedor"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Seleccionar proveedor"
          />
        )}

        <div className="space-y-1.5">
          <label htmlFor="observations" className="text-sm font-medium text-[var(--ink-secondary)]">Observaciones</label>
          <textarea
            id="observations"
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
            rows={3}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
          />
        </div>

        {error && (
          <div className="text-sm text-[var(--danger)] bg-[var(--danger-light)] px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--danger)]/20">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Procesando...' : 'Confirmar Retiro'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
