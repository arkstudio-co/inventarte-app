'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { withdrawalSchema, type WithdrawalFormData } from '@/lib/validations/withdrawal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import type { Product, Seller } from '@/types/database'

interface LocalFormData {
  product_id: string
  quantity: number | ''
  person_name: string
  person_email: string
  delivery_type: 'paid' | 'pending'
  pending_amount: number | '' | undefined
  observations: string
}

interface WithdrawalModalProps {
  productId: string
  onClose: () => void
  onSuccess: () => void
}

export function WithdrawalModal({ productId, onClose, onSuccess }: WithdrawalModalProps) {
  const supabase = createClient()
  const [product, setProduct] = useState<Product | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState(productId || '')

  const [form, setForm] = useState<LocalFormData>({
    product_id: productId || '',
    quantity: 1,
    person_name: '',
    person_email: '',
    delivery_type: 'paid',
    pending_amount: undefined,
    observations: '',
  })
  const [sellerId, setSellerId] = useState('')

  useEffect(() => {
    const sellersPromise = supabase.from('sellers').select('*').eq('is_active', true).order('name')

    const load = async () => {
      const [sellersRes, productsRes] = await Promise.all([
        sellersPromise,
        productId
          ? supabase.from('products').select('*').eq('id', productId).single()
          : supabase.from('products').select('*').eq('is_active', true).order('name'),
      ])

      if (sellersRes.data) setSellers(sellersRes.data)
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
    setForm({ ...form, product_id: id })
  }

  const handleSellerChange = (id: string) => {
    setSellerId(id)
    const seller = sellers.find((s) => s.id === id)
    if (seller) {
      setForm({ ...form, person_name: seller.name, person_email: seller.email || '' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedProductId && !productId) {
      setError('Debes seleccionar un producto')
      return
    }

    const quantity = form.quantity === '' ? 0 : form.quantity
    const pending_amount = form.pending_amount === '' ? undefined : form.pending_amount

    if (product && quantity > product.stock) {
      setError(`Solo hay ${product.stock} unidades disponibles`)
      return
    }

    const result = withdrawalSchema.safeParse({ ...form, quantity, pending_amount })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    setIsLoading(true)

    const res = await fetch('/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: form.product_id,
        quantity,
        person_name: form.person_name,
        person_email: form.person_email,
        delivery_type: form.delivery_type,
        pending_amount: form.delivery_type === 'pending' ? pending_amount : null,
        observations: form.delivery_type === 'pending' ? form.observations : null,
        seller_id: sellerId || null,
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
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: e.target.value === '' ? '' : Number(e.target.value) })}
          required
        />

        {product && form.quantity !== '' && form.quantity > product.stock && (
          <p className="text-xs text-[var(--danger)]">La cantidad supera el stock disponible ({product.stock} uds)</p>
        )}

        {sellers.length > 0 && (
          <Select
            id="seller"
            label="Colaborador (opcional)"
            value={sellerId}
            onChange={(e) => handleSellerChange(e.target.value)}
            options={sellers.map((s) => ({ value: s.id, label: s.name }))}
            placeholder="Seleccionar colaborador"
          />
        )}

        <Input
          id="person_name"
          label="Nombre de la persona"
          value={form.person_name}
          onChange={(e) => setForm({ ...form, person_name: e.target.value })}
          required
        />
        <Input
          id="person_email"
          label="Correo electrónico"
          type="email"
          value={form.person_email}
          onChange={(e) => setForm({ ...form, person_email: e.target.value })}
          required
        />

        <Select
          id="delivery_type"
          label="Tipo de entrega"
          value={form.delivery_type}
          onChange={(e) => setForm({ ...form, delivery_type: e.target.value as 'paid' | 'pending' })}
          options={[
            { value: 'paid', label: 'Producto pagado' },
            { value: 'pending', label: 'Producto por pagar' },
          ]}
        />

        {form.delivery_type === 'pending' && (
          <>
            <Input
              id="pending_amount"
              label="Valor pendiente"
              type="number"
              step="0.01"
              value={form.pending_amount || ''}
              onChange={(e) => setForm({ ...form, pending_amount: e.target.value === '' ? '' : Number(e.target.value) })}
            />
            <div className="space-y-1.5">
              <label htmlFor="observations" className="text-sm font-medium text-[var(--ink-secondary)]">Observaciones</label>
              <textarea
                id="observations"
                className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
                rows={3}
                value={form.observations || ''}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
              />
            </div>
          </>
        )}

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
