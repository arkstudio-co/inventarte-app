'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import type { Product } from '@/types/database'

interface StockAdjustmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  preSelectedProductId?: string
}

type AdjustmentType = 'positive' | 'negative'

const reasonOptions: { value: string; label: string }[] = [
  { value: 'count', label: 'Conteo físico' },
  { value: 'damage', label: 'Daño / merma' },
  { value: 'loss', label: 'Pérdida' },
  { value: 'return', label: 'Devolución' },
  { value: 'found', label: 'Hallazgo / sobrante' },
  { value: 'correction', label: 'Corrección de error' },
  { value: 'other', label: 'Otro' },
]

export function StockAdjustmentModal({ isOpen, onClose, onSuccess, preSelectedProductId }: StockAdjustmentModalProps) {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productId, setProductId] = useState(preSelectedProductId || '')
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('positive')
  const [quantity, setQuantity] = useState<number | ''>(1)
  const [reasonCode, setReasonCode] = useState('count')
  const [reason, setReason] = useState('')
  const [reference, setReference] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ stock_before: number; stock_after: number } | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const load = async () => {
      const res = await supabase.from('products').select('*').eq('is_active', true).order('name')
      if (res.data) setProducts(res.data)
    }
    setResult(null)
    setError('')
    load()
  }, [isOpen])

  useEffect(() => {
    if (!productId) { setSelectedProduct(null); return }
    const p = products.find((pr) => pr.id === productId)
    setSelectedProduct(p || null)
  }, [productId, products])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResult(null)

    if (!productId) { setError('Selecciona un producto'); return }
    if (quantity === '' || quantity < 1) { setError('La cantidad debe ser mayor a 0'); return }
    if (adjustmentType === 'negative' && selectedProduct && quantity > selectedProduct.stock) {
      setError(`Stock insuficiente: ${selectedProduct.stock} unidades disponibles`)
      return
    }

    setIsSubmitting(true)
    const { data, error: rpcError } = await supabase.rpc('adjust_stock', {
      p_product_id: productId, p_adjustment_type: adjustmentType, p_quantity: quantity,
      p_reason_code: reasonCode, p_reason: reason || null, p_reference: reference || null,
    })

    if (rpcError) { setError(rpcError.message); setIsSubmitting(false); return }
    const resultData = data as any
    if (resultData?.error) { setError(resultData.error); setIsSubmitting(false); return }

    setResult({ stock_before: resultData.stock_before, stock_after: resultData.stock_after })
    setIsSubmitting(false)
    setTimeout(() => { onClose(); onSuccess() }, 1500)
  }

  const resetForm = () => {
    setProductId(preSelectedProductId || '')
    setAdjustmentType('positive')
    setQuantity(1)
    setReasonCode('count')
    setReason('')
    setReference('')
    setError('')
    setResult(null)
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { resetForm(); onClose() }} title="Ajustar Stock">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product selection */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--ink-secondary)]">Producto</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            disabled={!!preSelectedProductId}
            required
          >
            <option value="">Seleccionar producto</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku}) — Stock: {p.stock} {p.abc_classification ? `[${p.abc_classification}]` : ''}
              </option>
            ))}
          </select>
          {selectedProduct && (
            <p className="text-xs text-[var(--ink-tertiary)]">
              Stock actual: <span className="font-semibold text-[var(--ink)]">{selectedProduct.stock} uds</span>
              {selectedProduct.abc_classification && <span className="ml-2">Clasificación: <span className={`font-semibold ${selectedProduct.abc_classification === 'A' ? 'text-[var(--danger)]' : selectedProduct.abc_classification === 'B' ? 'text-[var(--warning)]' : 'text-[var(--success)]'}`}>{selectedProduct.abc_classification}</span></span>}
            </p>
          )}
        </div>

        {/* Adjustment type */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--ink-secondary)]">Tipo de ajuste</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAdjustmentType('positive')}
              className={`flex-1 px-3 py-2 text-sm rounded-[var(--radius-sm)] border transition-colors cursor-pointer font-medium ${
                adjustmentType === 'positive'
                  ? 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/30'
                  : 'bg-[var(--surface-0)] text-[var(--ink-secondary)] border-[var(--border-default)] hover:border-[var(--success)]/30'
              }`}
            >
              + Entrada
            </button>
            <button
              type="button"
              onClick={() => setAdjustmentType('negative')}
              className={`flex-1 px-3 py-2 text-sm rounded-[var(--radius-sm)] border transition-colors cursor-pointer font-medium ${
                adjustmentType === 'negative'
                  ? 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/30'
                  : 'bg-[var(--surface-0)] text-[var(--ink-secondary)] border-[var(--border-default)] hover:border-[var(--danger)]/30'
              }`}
            >
              - Salida
            </button>
          </div>
        </div>

        {/* Quantity */}
        <Input
          label="Cantidad"
          type="number"
          min={1}
          max={adjustmentType === 'negative' ? selectedProduct?.stock || 1 : undefined}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
          required
        />

        {/* Reason code */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--ink-secondary)]">Motivo</label>
          <select
            value={reasonCode}
            onChange={(e) => setReasonCode(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          >
            {reasonOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--ink-secondary)]">Descripción (opcional)</label>
          <input
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="Explica el motivo del ajuste..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        {/* Reference */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[var(--ink-secondary)]">Referencia (opcional)</label>
          <input
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="N° de orden, remisión, etc."
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </div>

        {/* Success feedback */}
        {result && (
          <div className="text-sm text-[var(--success)] bg-[var(--success)]/10 px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--success)]/20 text-center">
            Stock actualizado: {result.stock_before} → {result.stock_after} unidades
          </div>
        )}

        {/* Error */}
        {error && !result && (
          <div className="text-sm text-[var(--danger)] bg-[var(--danger-light)] px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--danger)]/20">{error}</div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => { resetForm(); onClose() }} disabled={isSubmitting}>Cancelar</Button>
          <Button type="submit" disabled={isSubmitting || !!result}>
            {isSubmitting ? 'Ajustando...' : result ? 'Ajustado ✓' : 'Ajustar Stock'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
