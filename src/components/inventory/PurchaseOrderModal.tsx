'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Plus, Trash2, Package } from 'lucide-react'
import type { PurchaseOrder, Supplier, Product } from '@/types/database'

interface PurchaseOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  order?: PurchaseOrder | null
}

interface OrderItemInput {
  product_id: string
  product_name: string
  quantity: number | ''
  unit_cost: number | ''
}

export function PurchaseOrderModal({ isOpen, onClose, onSuccess, order }: PurchaseOrderModalProps) {
  const supabase = createClient()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [supplierId, setSupplierId] = useState(order?.supplier_id || '')
  const [notes, setNotes] = useState(order?.notes || '')
  const [items, setItems] = useState<OrderItemInput[]>([])

  useEffect(() => {
    if (!isOpen) return
    const load = async () => {
      const [suppliersRes, productsRes] = await Promise.all([
        supabase.from('suppliers').select('*').order('name'),
        supabase.from('products').select('*').eq('is_active', true).order('name'),
      ])
      if (suppliersRes.data) setSuppliers(suppliersRes.data)
      if (productsRes.data) setProducts(productsRes.data)
    }
    load()
  }, [isOpen])

  useEffect(() => {
    if (order && order.items) {
      setItems(order.items.map((i) => ({
        product_id: i.product_id || '',
        product_name: i.product_name,
        quantity: i.quantity,
        unit_cost: i.unit_cost,
      })))
    } else if (isOpen && !order) {
      setItems([{ product_id: '', product_name: '', quantity: 1, unit_cost: '' }])
    }
  }, [order, isOpen])

  const addItem = () => {
    setItems([...items, { product_id: '', product_name: '', quantity: 1, unit_cost: '' }])
  }

  const removeItem = (index: number) => {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof OrderItemInput, value: string | number | '') => {
    const updated = [...items]
    if (field === 'product_id') {
      const product = products.find((p) => p.id === value)
      updated[index] = {
        ...updated[index],
        product_id: value as string,
        product_name: product?.name || '',
        unit_cost: product?.cost !== undefined ? product.cost : updated[index].unit_cost,
      }
    } else {
      updated[index] = { ...updated[index], [field]: value }
    }
    setItems(updated)
  }

  const resetForm = () => {
    setSupplierId('')
    setNotes('')
    setItems([])
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!supplierId) { setError('Debes seleccionar un proveedor'); return }
    const validItems = items.filter((i) => i.product_id && i.quantity !== '' && i.unit_cost !== '')
    if (validItems.length === 0) { setError('Agrega al menos un producto'); return }

    setIsSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Debes iniciar sesión'); setIsSubmitting(false); return }

    if (order) {
      // Update existing order
      const { error: orderErr } = await supabase.from('purchase_orders').update({
        supplier_id: supplierId, notes: notes || null,
      }).eq('id', order.id)
      if (orderErr) { setError(orderErr.message); setIsSubmitting(false); return }

      // Delete existing items and re-insert
      await supabase.from('purchase_order_items').delete().eq('order_id', order.id)
      const orderItems = validItems.map((i) => {
        const product = products.find((p) => p.id === i.product_id)
        const unitCost = typeof i.unit_cost === 'number' ? i.unit_cost : 0
        const qty = typeof i.quantity === 'number' ? i.quantity : 0
        return {
          order_id: order.id, product_id: i.product_id, product_name: product?.name || '',
          quantity: qty, unit_cost: unitCost, subtotal: qty * unitCost, received_quantity: 0,
        }
      })
      if (orderItems.length > 0) {
        const { error: itemsErr } = await supabase.from('purchase_order_items').insert(orderItems)
        if (itemsErr) { setError(itemsErr.message); setIsSubmitting(false); return }
      }
    } else {
      // Create new order
      const { data: orderNumber } = await supabase.rpc('generate_order_number')
      const orderNum = orderNumber || `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0001`

      const { data: newOrder, error: orderErr } = await supabase.from('purchase_orders').insert({
        order_number: orderNum, supplier_id: supplierId, notes: notes || null, created_by: user.id,
      }).select().single()
      if (orderErr) { setError(orderErr.message); setIsSubmitting(false); return }

      const orderItems = validItems.map((i) => {
        const product = products.find((p) => p.id === i.product_id)
        const unitCost = typeof i.unit_cost === 'number' ? i.unit_cost : 0
        const qty = typeof i.quantity === 'number' ? i.quantity : 0
        return {
          order_id: newOrder.id, product_id: i.product_id, product_name: product?.name || '',
          quantity: qty, unit_cost: unitCost, subtotal: qty * unitCost, received_quantity: 0,
        }
      })
      const { error: itemsErr } = await supabase.from('purchase_order_items').insert(orderItems)
      if (itemsErr) { setError(itemsErr.message); setIsSubmitting(false); return }
    }

    setIsSubmitting(false)
    resetForm()
    onClose()
    onSuccess()
  }

  const totalDisplay = items.reduce((s, i) => {
    const qty = typeof i.quantity === 'number' ? i.quantity : 0
    const cost = typeof i.unit_cost === 'number' ? i.unit_cost : 0
    return s + qty * cost
  }, 0)

  return (
    <Modal isOpen={isOpen} onClose={() => { resetForm(); onClose() }} title={order ? `Editar Orden ${order.order_number}` : 'Nueva Orden de Compra'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--ink-secondary)]">Proveedor</label>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            required
          >
            <option value="">Seleccionar proveedor</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Productos</label>
            <Button type="button" variant="secondary" size="sm" onClick={addItem}>
              <Plus size={14} /> Agregar
            </Button>
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {items.map((item, index) => (
              <div key={index} className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-0)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1.5">
                    <select
                      value={item.product_id}
                      onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                      className="w-full px-2.5 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-1)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                    >
                      <option value="">Seleccionar producto</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) — Costo: ${p.cost}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-1 text-[var(--ink-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-[var(--radius-sm)] transition-colors cursor-pointer shrink-0"
                    disabled={items.length <= 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] text-[var(--ink-tertiary)] font-medium">Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-1)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] text-[var(--ink-tertiary)] font-medium">Costo Uni.</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unit_cost}
                      onChange={(e) => updateItem(index, 'unit_cost', e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-1)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[11px] text-[var(--ink-tertiary)] font-medium">Subtotal</label>
                    <div className="px-2.5 py-1.5 text-sm text-[var(--ink)] font-medium bg-[var(--surface-1)] rounded-[var(--radius-sm)] border border-[var(--border-subtle)]">
                      ${((typeof item.quantity === 'number' ? item.quantity : 0) * (typeof item.unit_cost === 'number' ? item.unit_cost : 0)).toLocaleString('es-CO')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-[var(--radius-sm)] bg-[var(--surface-0)] border border-[var(--border-subtle)]">
          <span className="text-sm font-medium text-[var(--ink-secondary)]">Total estimado</span>
          <span className="text-lg font-bold text-[var(--ink)]">${totalDisplay.toLocaleString('es-CO', { minimumFractionDigits: 0 })}</span>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--ink-secondary)]">Notas (opcional)</label>
          <textarea
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas internas..."
          />
        </div>

        {error && <div className="text-sm text-[var(--danger)] bg-[var(--danger-light)] px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--danger)]/20">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => { resetForm(); onClose() }}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : order ? 'Actualizar Orden' : 'Crear Orden'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
