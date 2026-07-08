'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useCompany } from '@/providers/CompanyProvider'
import type { Supplier } from '@/types/database'

interface EntryStockModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  products: { id: string; name: string; sku: string; stock: number }[]
}

const selectedProduct = (id: string, list: EntryStockModalProps['products']) =>
  list.find((p) => p.id === id)

export function EntryStockModal({ isOpen, onClose, onSuccess, products }: EntryStockModalProps) {
  const supabase = createClient()
  const { companyId } = useCompany()
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState<number | ''>(1)
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('pending')
  const [observations, setObservations] = useState('')
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0])
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierId, setSupplierId] = useState('')
  const [productCost, setProductCost] = useState(0)

  const prod = selectedProduct(productId, products)

  useEffect(() => {
    if (!isOpen) return
    supabase.from('suppliers').select('*').order('name').then(({ data }) => {
      if (data) setSuppliers(data)
    })
  }, [isOpen])

  useEffect(() => {
    if (!productId) { setProductCost(0); return }
    supabase.from('products').select('cost').eq('id', productId).single().then(({ data }) => {
      if (data) setProductCost(data.cost)
    })
  }, [productId])

  const totalCost = quantity === '' ? 0 : quantity * productCost

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (quantity === '' || quantity < 1) {
      setError('La cantidad debe ser mayor a 0')
      return
    }
    setIsAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Debes iniciar sesión'); setIsAdding(false); return }

    const { error: insertError } = await supabase.from('stock_entries').insert({
      product_id: productId, quantity, company_id: companyId,
      payment_status: paymentStatus, observations: observations || null, created_by: user.id,
      created_at: entryDate,
    })
    if (insertError) { setError(insertError.message); setIsAdding(false); return }

    if (paymentStatus === 'pending') {
      const { error: apError } = await supabase.from('accounts_payable').insert({
        company_id: companyId,
        amount: totalCost,
        supplier_id: supplierId || null,
        description: `Compra de ${prod?.name || 'producto'} x${quantity}`,
        due_date: null,
      })
      if (apError) { setError(apError.message); setIsAdding(false); return }
    }

    await supabase.rpc('increment_stock', { p_product_id: productId, p_quantity: quantity })
    setIsAdding(false)
    onClose()
    setProductId(''); setQuantity(1); setPaymentStatus('pending'); setObservations(''); setEntryDate(new Date().toISOString().split('T')[0]); setSupplierId(''); setProductCost(0); setError('')
    onSuccess()
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); setProductId(''); setQuantity(1); setPaymentStatus('pending'); setObservations(''); setEntryDate(new Date().toISOString().split('T')[0]); setSupplierId(''); setProductCost(0); setError('') }} title="Registrar Entrada de Stock">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--ink-secondary)]">Producto</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            required
          >
            <option value="">Seleccionar producto</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku}) &mdash; Stock: {p.stock}</option>
            ))}
          </select>
        </div>
        <Input label="Fecha de entrada" type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
        <Input label="Cantidad" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))} required />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--ink-secondary)]">Estado de pago</label>
          <select
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value as 'paid' | 'pending')}
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          >
            <option value="pending">Pendiente</option>
            <option value="paid">Pagado</option>
          </select>
        </div>
        {paymentStatus === 'pending' && productId && (
          <>
            <div className="rounded-[var(--radius-sm)] bg-[var(--warning)]/5 border border-[var(--warning)]/20 p-3 space-y-1">
              <p className="text-xs text-[var(--ink-tertiary)] uppercase tracking-wide font-semibold">Deuda generada</p>
              <p className="text-sm font-bold text-[var(--ink)]">{quantity} × ${productCost.toLocaleString('es-CO')} = ${totalCost.toLocaleString('es-CO')}</p>
            </div>
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
          </>
        )}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--ink-secondary)]">Observaciones</label>
          <textarea
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
            rows={2}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Opcional"
          />
        </div>
        {error && <div className="text-sm text-[var(--danger)] bg-[var(--danger-light)] px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--danger)]/20">{error}</div>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => { onClose(); setProductId(''); setQuantity(1); setPaymentStatus('pending'); setObservations(''); setEntryDate(new Date().toISOString().split('T')[0]); setSupplierId(''); setProductCost(0); setError('') }}>Cancelar</Button>
          <Button type="submit" disabled={isAdding || !productId}>{isAdding ? 'Registrando...' : 'Registrar Entrada'}</Button>
        </div>
      </form>
    </Modal>
  )
}
