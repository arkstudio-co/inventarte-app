'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { generateSKU } from '@/lib/utils/sku-generator'
import { productSchema, type ProductFormData } from '@/lib/validations/product'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Upload } from 'lucide-react'

interface CreateProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function CreateProductModal({ isOpen, onClose, onSuccess }: CreateProductModalProps) {
  const supabase = createClient()
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [sku] = useState(generateSKU())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState<ProductFormData>({
    name: '',
    description: '',
    stock: '',
    min_stock: '',
    price: '',
    cost: '',
    gramaje: '',
    supplier_id: '',
    image_url: '',
  })

  useEffect(() => {
    if (isOpen) {
      supabase.from('suppliers').select('id, name').then(({ data }) => {
        if (data) setSuppliers(data)
      })
      setForm({
        name: '',
        description: '',
        stock: '',
        min_stock: '',
        price: '',
        cost: '',
        gramaje: '',
        supplier_id: '',
        image_url: '',
      })
      setError('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = productSchema.safeParse(form)
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    setIsLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError('Debes iniciar sesión')
      setIsLoading(false)
      return
    }

    const { error: insertError } = await supabase.from('products').insert({
      sku,
      name: form.name,
      description: form.description || null,
      stock: form.stock === '' ? 0 : form.stock,
      min_stock: form.min_stock === '' ? 0 : form.min_stock,
      price: form.price === '' ? 0 : form.price,
      cost: form.cost === '' ? 0 : form.cost,
      gramaje: form.gramaje ? Number(form.gramaje) : null,
      supplier_id: form.supplier_id || null,
      image_url: form.image_url || null,
      created_by: user.id,
    })

    if (insertError) {
      setError(insertError.message)
      setIsLoading(false)
      return
    }

    setIsLoading(false)
    onSuccess()
  }

  const updateField = (field: keyof ProductFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Producto">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-0)] border border-[var(--border-subtle)]">
          <label className="text-xs font-medium text-[var(--ink-tertiary)] uppercase tracking-wide">SKU (autogenerado)</label>
          <p className="text-sm font-mono text-[var(--ink)] mt-1">{sku}</p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-[var(--ink-secondary)]">Imagen del producto</label>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-[var(--radius-sm)] bg-[var(--surface-0)] border border-[var(--border-default)] flex items-center justify-center text-[var(--ink-muted)] overflow-hidden shrink-0">
              {form.image_url ? (
                <img src={form.image_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Upload size={20} />
              )}
            </div>
            <Input
              placeholder="URL de la imagen"
              value={form.image_url || ''}
              onChange={(e) => updateField('image_url', e.target.value)}
            />
          </div>
        </div>

        <Input
          id="name"
          label="Nombre del producto"
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          required
        />

        <div className="space-y-1.5">
          <label htmlFor="description" className="text-sm font-medium text-[var(--ink-secondary)]">Descripción</label>
          <textarea
            id="description"
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
            rows={2}
            value={form.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="stock"
            label="Stock"
            type="number"
            value={form.stock}
            onChange={(e) => updateField('stock', e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
          <Input
            id="min_stock"
            label="Stock mínimo"
            type="number"
            value={form.min_stock}
            onChange={(e) => updateField('min_stock', e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="price"
            label="Precio venta vendedores"
            type="number"
            step="0.01"
            value={form.price}
            onChange={(e) => updateField('price', e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
          <Input
            id="cost"
            label="Precio producción"
            type="number"
            step="0.01"
            value={form.cost}
            onChange={(e) => updateField('cost', e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
          <Input
            id="gramaje"
            label="Gramaje (g)"
            type="number"
            step="0.01"
            value={form.gramaje ?? ''}
            onChange={(e) => updateField('gramaje', e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>

        <Select
          id="supplier"
          label="Proveedor (opcional)"
          value={form.supplier_id || ''}
          onChange={(e) => updateField('supplier_id', e.target.value)}
          options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          placeholder="Seleccionar proveedor"
        />

        {error && (
          <div className="text-sm text-[var(--danger)] bg-[var(--danger-light)] px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--danger)]/20">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creando...' : 'Crear Producto'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
