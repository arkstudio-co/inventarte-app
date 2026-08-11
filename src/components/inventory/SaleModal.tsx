'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { Product, Seller } from '@/types/database'

interface SaleItem {
  id: string
  product_id: string
  quantity: number | ''
  unit_price: number | ''
}

interface SaleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  products: Product[]
  sellerId?: string
}

let itemId = 0
const nextItemId = () => `si-${++itemId}`

export function SaleModal({ isOpen, onClose, onSuccess, products, sellerId }: SaleModalProps) {
  const supabase = createClient()
  const router = useRouter()

  const [sellers, setSellers] = useState<Seller[]>([])
  const [selectedSellerId, setSelectedSellerId] = useState(sellerId || '')
  const [items, setItems] = useState<SaleItem[]>([{ id: nextItemId(), product_id: '', quantity: '', unit_price: '' }])
  const [deliveryType, setDeliveryType] = useState<'paid' | 'pending'>('pending')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash')
  const [bankAccount, setBankAccount] = useState('')
  const [cardLastFour, setCardLastFour] = useState('')
  const [paymentObservations, setPaymentObservations] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setSelectedSellerId(sellerId || '')
    setError('')
    supabase.from('sellers').select('*').order('name').then(({ data }) => {
      if (data) setSellers(data)
    })
  }, [isOpen, sellerId])

  const addItem = () => setItems((prev) => [...prev, { id: nextItemId(), product_id: '', quantity: '', unit_price: '' }])
  const updateItem = (id: string, field: { product_id?: string; quantity?: number | ''; unit_price?: number | '' }) =>
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i
      const updated = { ...i, ...field }
      if (field.product_id !== undefined) {
        const prod = getProduct(field.product_id)
        updated.unit_price = prod?.price ?? ''
      }
      return updated
    }))
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))

  const getProduct = (pid: string) => products.find((p) => p.id === pid)
  const linePrice = (i: SaleItem) => {
    if (i.unit_price !== '') return i.unit_price as number
    return getProduct(i.product_id)?.price || 0
  }
  const totalValue = items.reduce((s, i) => {
    if (!i.product_id || i.quantity === '') return s
    return s + (i.quantity as number) * linePrice(i)
  }, 0)
  const totalQty = items.reduce((s, i) => {
    if (!i.product_id || i.quantity === '') return s
    return s + (i.quantity as number)
  }, 0)

  const resetForm = () => {
    setItems([{ id: nextItemId(), product_id: '', quantity: '', unit_price: '' }])
    setDeliveryType('pending')
    setPaymentMethod('cash')
    setBankAccount('')
    setCardLastFour('')
    setPaymentObservations('')
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validItems = items.filter((i) => i.product_id && i.quantity !== '' && (i.quantity as number) > 0)
    if (!selectedSellerId) { setError('Selecciona un vendedor'); return }
    if (validItems.length === 0) { setError('Agrega al menos un producto'); return }
    for (const item of validItems) {
      const prod = getProduct(item.product_id)
      if (!prod) continue
      if (prod.stock <= 0) {
        setError(`No hay stock disponible de ${prod.name}`)
        return
      }
      if ((item.quantity as number) > prod.stock) {
        setError(`Stock insuficiente de ${prod.name}: solo hay ${prod.stock} disponibles`)
        return
      }
    }
    if (deliveryType === 'paid' && paymentMethod === 'transfer' && (!bankAccount.trim() || cardLastFour.length !== 4)) {
      setError('Completa la cuenta bancaria y los últimos 4 dígitos')
      return
    }
    setSaving(true)
    setError('')

    const seller = await supabase.from('sellers').select('name, email').eq('id', selectedSellerId).single()

    const payload: any = {
      seller_id: selectedSellerId,
      person_name: seller.data?.name || '',
      person_email: seller.data?.email || '',
      delivery_type: deliveryType,
      notes: null,
      items: validItems.map((i) => ({
        product_id: i.product_id,
        product_name: getProduct(i.product_id)?.name || '',
        quantity: i.quantity,
        unit_price: linePrice(i),
        unit_cost: getProduct(i.product_id)?.cost ?? 0,
      })),
    }

    if (deliveryType === 'paid') {
      payload.payment_method = paymentMethod
      payload.bank_account = bankAccount || null
      payload.card_last_four = cardLastFour || null
      payload.payment_observations = paymentObservations || null
    }

    const res = await fetch('/api/remisiones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Error al asignar producto')
      setSaving(false)
      return
    }

    const remision = await res.json()
    setSaving(false)
    onClose()
    resetForm()
    onSuccess()
    if (remision?.id) router.push(`/colaboradores/remisiones/${remision.id}`)
  }

  const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); resetForm() }} title="Venta">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!sellerId && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Vendedor</label>
            <select
              value={selectedSellerId}
              onChange={(e) => setSelectedSellerId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="">Seleccionar vendedor</option>
              {sellers.filter((s) => s.is_active).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--surface-0)] border-b border-[var(--border-default)]">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">Productos a entregar</span>
            <button
              type="button"
              onClick={addItem}
              className="text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary-light)] px-2 py-1 rounded-[var(--radius-sm)] transition-colors cursor-pointer"
            >
              + Añadir
            </button>
          </div>

          {(() => {
            const selectedIds = new Set(items.map((i) => i.product_id).filter(Boolean))
            return items.map((item) => {
              const prod = item.product_id ? getProduct(item.product_id) : undefined
              return (
                <div key={item.id} className="px-3 py-2 border-b border-[var(--border-default)] last:border-b-0">
                  <div className="grid grid-cols-[1fr_72px_100px_28px] gap-2 items-center">
                    <select
                      value={item.product_id}
                      onChange={(e) => updateItem(item.id, { product_id: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                    >
                      <option value="">Seleccionar producto</option>
                      {products
                        .filter((p) => p.is_active && (p.id === item.product_id || !selectedIds.has(p.id)))
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {formatCurrency(p.price)} c/u{p.stock <= 0 ? ' (Sin stock)' : ` — Stock: ${p.stock}`}
                          </option>
                        ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={prod && prod.stock > 0 ? prod.stock : undefined}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, { quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="Cant."
                      className="w-full px-2 py-1.5 text-sm text-center rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <input
                      type="number"
                      min={0}
                      value={item.unit_price}
                      onChange={(e) => updateItem(item.id, { unit_price: e.target.value === '' ? '' : Number(e.target.value) })}
                      placeholder="Precio"
                      className="w-full px-2 py-1.5 text-sm text-center rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
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
                  {prod && item.quantity !== '' && prod.stock <= 0 && (
                    <p className="mt-1 text-[11px] text-[var(--danger)]">No hay stock disponible de {prod.name}</p>
                  )}
                  {prod && item.quantity !== '' && prod.stock > 0 && (item.quantity as number) > prod.stock && (
                    <p className="mt-1 text-[11px] text-[var(--danger)]">Stock disponible: {prod.stock}</p>
                  )}
                </div>
              )
            })
          })()}
        </div>

        {totalValue > 0 && (
          <div className="rounded-[var(--radius-sm)] bg-[var(--primary-light)] border border-[var(--primary)]/20 p-3">
            <p className="text-xs text-[var(--ink-tertiary)] uppercase tracking-wide font-semibold">Total</p>
            <p className="text-sm font-bold text-[var(--primary)]">{formatCurrency(totalValue)} ({totalQty} unidades)</p>
          </div>
        )}

        <select
          value={deliveryType}
          onChange={(e) => setDeliveryType(e.target.value as 'paid' | 'pending')}
          className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
        >
          <option value="paid">Producto pagado</option>
          <option value="pending">Producto por pagar</option>
        </select>

        {deliveryType === 'paid' && (
          <div className="border-t border-[var(--border-subtle)] pt-3">
            <p className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase mb-3">Información del pago</p>

            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'transfer')}
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
            </select>

            {paymentMethod === 'transfer' && (
              <div className="space-y-3 mt-3">
                <Input label="Cuenta bancaria" value={bankAccount} onChange={(e) => setBankAccount(e.target.value)} required />
                <Input
                  label="Últimos 4 dígitos de la tarjeta"
                  value={cardLastFour}
                  onChange={(e) => setCardLastFour(e.target.value.slice(0, 4))}
                  maxLength={4}
                  required
                />
              </div>
            )}

            <div className="space-y-1.5 mt-3">
              <label className="text-sm font-medium text-[var(--ink-secondary)]">Observaciones</label>
              <textarea
                className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
                rows={2}
                value={paymentObservations}
                onChange={(e) => setPaymentObservations(e.target.value)}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-[var(--danger)] bg-[var(--danger-light)] px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--danger)]/20">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => { onClose(); resetForm() }}>Cancelar</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Asignando...' : 'Asignar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}