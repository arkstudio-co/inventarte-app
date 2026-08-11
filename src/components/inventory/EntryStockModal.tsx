'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useCompany } from '@/providers/CompanyProvider'
import type { Supplier } from '@/types/database'

interface EntryStockItem {
  id: string
  product_id: string
  quantity: number | ''
  unit_cost: number | ''
}

interface EntryStockModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  products: { id: string; name: string; sku: string; stock: number; cost: number }[]
}

let entryItemId = 0
function nextEntryId() { return `ei-${++entryItemId}` }

export function EntryStockModal({ isOpen, onClose, onSuccess, products }: EntryStockModalProps) {
  const supabase = createClient()
  const { companyId } = useCompany()
  const today = new Date().toISOString().split('T')[0]
  const [items, setItems] = useState<EntryStockItem[]>([{ id: nextEntryId(), product_id: '', quantity: '', unit_cost: '' }])
  const [entryDate, setEntryDate] = useState(today)
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('pending')
  const [supplierId, setSupplierId] = useState('')
  const [observations, setObservations] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  useEffect(() => {
    if (!isOpen) return
    supabase.from('suppliers').select('*').order('name').then(({ data }) => {
      if (data) setSuppliers(data)
    })
  }, [isOpen])

  const addItem = () => setItems((prev) => [...prev, { id: nextEntryId(), product_id: '', quantity: '', unit_cost: '' }])
  const updateItem = (id: string, field: { product_id?: string; quantity?: number | ''; unit_cost?: number | '' }) =>
    setItems((prev) => prev.map((i) => {
      if (i.id !== id) return i
      const updated = { ...i, ...field }
      if (field.product_id !== undefined) {
        const prod = products.find((p) => p.id === field.product_id)
        updated.unit_cost = prod?.cost ?? ''
      }
      return updated
    }))
  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))

  const getProduct = (pid: string) => products.find((p) => p.id === pid)
  const lineCost = (i: EntryStockItem) => {
    if (i.unit_cost !== '') return i.unit_cost as number
    return getProduct(i.product_id)?.cost || 0
  }
  const totalCost = items.reduce((s, i) => {
    if (!i.product_id || i.quantity === '') return s
    return s + (i.quantity as number) * lineCost(i)
  }, 0)
  const totalQty = items.reduce((s, i) => {
    if (!i.product_id || i.quantity === '') return s
    return s + (i.quantity as number)
  }, 0)

  const resetForm = () => {
    setItems([{ id: nextEntryId(), product_id: '', quantity: '', unit_cost: '' }])
    setEntryDate(new Date().toISOString().split('T')[0])
    setPaymentStatus('pending')
    setSupplierId('')
    setObservations('')
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (entryDate > today) {
      setError('La fecha de entrada no puede ser futura')
      return
    }
    const validItems = items.filter((i) => i.product_id && i.quantity !== '' && (i.quantity as number) > 0)
    if (validItems.length === 0) { setError('Agrega al menos un producto con cantidad válida'); return }
    setIsAdding(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Debes iniciar sesión'); setIsAdding(false); return }

    for (const item of validItems) {
      const cost = lineCost(item)
      const qty = item.quantity as number

      const { error: insertError } = await supabase.from('stock_entries').insert({
        product_id: item.product_id,
        quantity: qty,
        unit_cost: cost,
        company_id: companyId,
        payment_status: paymentStatus,
        observations: observations || null,
        created_by: user.id,
        created_at: entryDate,
      })
      if (insertError) { setError(insertError.message); setIsAdding(false); return }

      if (paymentStatus === 'pending') {
        const prod = getProduct(item.product_id)
        const { error: apError } = await supabase.from('accounts_payable').insert({
          company_id: companyId,
          amount: qty * cost,
          supplier_id: supplierId || null,
          description: `Compra de ${prod?.name || 'producto'} x${qty}`,
          due_date: null,
        })
        if (apError) { setError(apError.message); setIsAdding(false); return }
      }

      const { data: stockResult, error: stockError } = await supabase.rpc('increment_stock', {
        p_product_id: item.product_id,
        p_quantity: qty,
      })
      const sr = stockResult as any
      if (stockError || sr?.error) { setError(sr?.error || stockError?.message); setIsAdding(false); return }
    }

    setIsAdding(false)
    onClose()
    resetForm()
    onSuccess()
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); resetForm() }} title="Registrar Entrada de Stock">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Fecha de entrada" type="date" value={entryDate} max={today} onChange={(e) => setEntryDate(e.target.value)} />

        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--surface-0)] border-b border-[var(--border-default)]">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-tertiary)]">Productos</span>
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
              const cost = lineCost(item)
              const qty = item.quantity === '' ? 0 : (item.quantity as number)
              return (
                <div key={item.id} className="grid grid-cols-[1fr_72px_90px_28px] gap-2 px-3 py-2 items-center border-b border-[var(--border-default)] last:border-b-0">
                  <select
                    value={item.product_id}
                    onChange={(e) => updateItem(item.id, { product_id: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                  >
                    <option value="">Seleccionar producto</option>
                    {products
                      .filter((p) => p.id === item.product_id || !selectedIds.has(p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku}) &mdash; Stock: {p.stock}</option>
                      ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, { quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder="Cant."
                    className="w-full px-2 py-1.5 text-sm text-center rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <input
                    type="number"
                    min={0}
                    value={item.unit_cost}
                    onChange={(e) => updateItem(item.id, { unit_cost: e.target.value === '' ? '' : Number(e.target.value) })}
                    placeholder="Costo uni."
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
              )
            })
          })()}
        </div>

        {totalCost > 0 && (
          <div className="rounded-[var(--radius-sm)] bg-[var(--primary-light)] border border-[var(--primary)]/20 p-3">
            <p className="text-xs text-[var(--ink-tertiary)] uppercase tracking-wide font-semibold">Costo total</p>
            <p className="text-sm font-bold text-[var(--primary)]">${totalCost.toLocaleString('es-CO')} ({totalQty} unidades)</p>
          </div>
        )}

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

        {paymentStatus === 'pending' && (
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
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
            rows={2}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Opcional"
          />
        </div>

        {error && <div className="text-sm text-[var(--danger)] bg-[var(--danger-light)] px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--danger)]/20">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => { onClose(); resetForm() }}>Cancelar</Button>
          <Button type="submit" disabled={isAdding || items.every((i) => !i.product_id)}>
            {isAdding ? 'Registrando...' : 'Registrar Entrada'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
