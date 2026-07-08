'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { Product, Supplier } from '@/types/database'

interface WithdrawalItem {
  id: string
  product_id: string
  quantity: number | ''
}

const REASONS = [
  { value: 'defectuoso', label: 'Producto defectuoso' },
  { value: 'error_inventario', label: 'Error de inventario' },
  { value: 'vencido', label: 'Producto vencido' },
  { value: 'devolucion_proveedor', label: 'Devolución al proveedor' },
  { value: 'otro', label: 'Otro' },
]

let itemIdCounter = 0
const newItemId = () => `item-${++itemIdCounter}`

interface WithdrawalModalProps {
  productId: string
  onClose: () => void
  onSuccess: () => void
}

export function WithdrawalModal({ productId, onClose, onSuccess }: WithdrawalModalProps) {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [reason, setReason] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [observations, setObservations] = useState('')

  const [items, setItems] = useState<WithdrawalItem[]>([{
    id: newItemId(),
    product_id: productId || '',
    quantity: productId ? 1 : '',
  }])

  useEffect(() => {
    const load = async () => {
      const [suppliersRes, productsRes] = await Promise.all([
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('products').select('*').eq('is_active', true).order('name'),
      ])
      if (suppliersRes.data) setSuppliers(suppliersRes.data)
      if (productsRes.data) setProducts(productsRes.data as Product[])
    }
    load()
  }, [])

  const updateItem = (id: string, field: Partial<WithdrawalItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...field } : i)))
  }

  const addItem = () => {
    setItems((prev) => [...prev, { id: newItemId(), product_id: '', quantity: '' }])
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }

  const getProduct = (productId: string) => products.find((p) => p.id === productId)

  const totalValue = items.reduce((sum, item) => {
    if (!item.product_id || item.quantity === '') return sum
    const prod = getProduct(item.product_id)
    return sum + (item.quantity as number) * (prod?.cost || 0)
  }, 0)

  const totalQty = items.reduce((sum, item) => {
    if (!item.product_id || item.quantity === '') return sum
    return sum + (item.quantity as number)
  }, 0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validItems = items.filter((i) => i.product_id && i.quantity !== '' && (i.quantity as number) > 0)

    if (validItems.length === 0) {
      setError('Agrega al menos un producto con cantidad válida')
      return
    }

    for (const item of validItems) {
      const prod = getProduct(item.product_id)
      if (prod && (item.quantity as number) > prod.stock) {
        setError(`Stock insuficiente para "${prod.name}": ${prod.stock} uds disponibles`)
        return
      }
    }

    if (!reason) {
      setError('Selecciona un motivo')
      return
    }

    setIsLoading(true)

    const res = await fetch('/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: validItems.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
        })),
        reason,
        supplier_id: reason === 'devolucion_proveedor' ? supplierId || null : null,
        observations,
      }),
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
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--ink-secondary)]">Motivo del retiro</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          >
            <option value="">Seleccionar motivo</option>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--surface-0)] border-b border-[var(--border-default)]">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">Productos a retirar</span>
            <button
              type="button"
              onClick={addItem}
              className="text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary-light)] px-2 py-1 rounded-[var(--radius-sm)] transition-colors cursor-pointer"
            >
              + Añadir
            </button>
          </div>

          {items.map((item, idx) => {
            const prod = item.product_id ? getProduct(item.product_id) : undefined
            return (
              <div key={item.id} className="grid grid-cols-[1fr_72px_28px] gap-2 px-3 py-2 items-center border-b border-[var(--border-default)] last:border-b-0">
                <select
                  value={item.product_id}
                  onChange={(e) => updateItem(item.id, { product_id: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                >
                  <option value="">Seleccionar producto</option>
                  {products
                    .filter((p) => p.stock > 0)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — Stock: {p.stock}
                      </option>
                    ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={prod?.stock || 1}
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, { quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                  placeholder="Cant."
                  className="w-full px-2 py-1.5 text-sm text-center rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  disabled={items.length <= 1}
                  className="w-7 h-7 flex items-center justify-center text-xs rounded-[var(--radius-sm)] text-[var(--ink-muted)] hover:bg-[var(--danger-light)] hover:text-[var(--danger)] transition-colors disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>

        {totalValue > 0 && (
          <div className="rounded-[var(--radius-sm)] bg-[var(--primary-light)] border border-[var(--primary)]/20 p-3">
            <p className="text-xs text-[var(--ink-tertiary)] uppercase tracking-wide font-semibold">Valor total del retiro</p>
            <p className="text-sm font-bold text-[var(--primary)]">
              ${totalValue.toLocaleString('es-CO')} ({totalQty} unidades)
            </p>
          </div>
        )}

        {reason === 'devolucion_proveedor' && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Proveedor</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="">Seleccionar proveedor (opcional)</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--ink-secondary)]">Observaciones</label>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Notas adicionales..."
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
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
