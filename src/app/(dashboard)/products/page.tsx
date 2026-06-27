'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Plus, Package, Pencil, Trash2 } from 'lucide-react'
import type { Product } from '@/types/database'

export default function ProductsPage() {
  const supabase = createClient()
  const [products, setProducts] = useState<Product[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [form, setForm] = useState<{ name: string; cost: number; price: number; suggested_price: number | string }>({ name: '', cost: 0, price: 0, suggested_price: '' })
  const [saving, setSaving] = useState(false)

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('is_active', true).order('name')
    if (data) setProducts(data)
  }

  useEffect(() => { fetchProducts() }, [])

  const openCreate = () => {
    setEditingProduct(null)
    setForm({ name: '', cost: 0, price: 0, suggested_price: '' })
    setModalOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditingProduct(p)
    setForm({
      name: p.name,
      cost: p.cost,
      price: p.price,
      suggested_price: p.suggested_price?.toString() || '',
    })
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)

    const payload = {
      name: form.name,
      cost: form.cost,
      price: form.price,
      suggested_price: form.suggested_price ? Number(form.suggested_price) : null,
    }

    if (editingProduct) {
      await supabase.from('products').update(payload).eq('id', editingProduct.id)
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('products').insert({
          ...payload,
          sku: 'PROD-' + Date.now(),
          stock: 0,
          min_stock: 0,
          created_by: user.id,
        })
      }
    }

    setSaving(false)
    setModalOpen(false)
    fetchProducts()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return
    await supabase.from('products').delete().eq('id', id)
    fetchProducts()
  }

  const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Productos</h1>
        <Button onClick={openCreate}>
          <Plus size={16} /> Crear Producto
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-8 text-center">
          <Package size={40} className="mx-auto mb-3 text-[var(--ink-muted)]" />
          <p className="text-sm text-[var(--ink-tertiary)]">No hay productos registrados</p>
          <Button variant="secondary" className="mt-4" onClick={openCreate}>
            <Plus size={16} /> Crear primer producto
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <div key={p.id} className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div className="sm:col-span-1">
                  <p className="text-sm font-medium text-[var(--ink)] truncate">{p.name}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--ink-tertiary)] uppercase">Producción</p>
                  <p className="text-sm font-semibold text-[var(--danger)]">{formatCurrency(p.cost)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--ink-tertiary)] uppercase">Venta vendedores</p>
                  <p className="text-sm font-semibold text-[var(--success)]">{formatCurrency(p.price)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--ink-tertiary)] uppercase">Sugerido mercado</p>
                  <p className="text-sm font-semibold text-[var(--accent)]">
                    {p.suggested_price ? formatCurrency(p.suggested_price) : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => openEdit(p)} className="p-1.5 text-[var(--ink-tertiary)] hover:text-[var(--tint)] hover:bg-[var(--tint-light)] rounded-[var(--radius-sm)] cursor-pointer" title="Editar">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 text-[var(--ink-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] rounded-[var(--radius-sm)] cursor-pointer" title="Eliminar">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}>
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Nombre del producto"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Precio de producción"
              type="number"
              step="0.01"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })}
              required
            />
            <Input
              label="Precio venta vendedores"
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              required
            />
          </div>
          <Input
            label="Precio sugerido mercado (opcional)"
            type="number"
            step="0.01"
            value={form.suggested_price}
            onChange={(e) => setForm({ ...form, suggested_price: e.target.value === '' ? '' : Number(e.target.value) })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando...' : editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
