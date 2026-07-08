'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useCompany } from '@/providers/CompanyProvider'
import { Plus, Building2, Trash2, Edit } from 'lucide-react'
import type { Supplier } from '@/types/database'

export default function ProveedoresPage() {
  const supabase = createClient()
  const { companyId } = useCompany()

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [form, setForm] = useState({ name: '', contact: '', email: '', phone: '' })

  const fetchData = async () => {
    setIsLoading(true)
    const { data } = await supabase.from('suppliers').select('*').order('name')
    if (data) setSuppliers(data)
    setIsLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const openNew = () => {
    setEditingSupplier(null)
    setForm({ name: '', contact: '', email: '', phone: '' })
    setShowModal(true)
  }

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s)
    setForm({
      name: s.name,
      contact: s.contact || '',
      email: s.email || '',
      phone: s.phone || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return
    if (editingSupplier) {
      await supabase.from('suppliers').update(form).eq('id', editingSupplier.id)
    } else {
      await supabase.from('suppliers').insert({ ...form, company_id: companyId })
    }
    setShowModal(false)
    setEditingSupplier(null)
    setForm({ name: '', contact: '', email: '', phone: '' })
    fetchData()
  }

  const deleteSupplier = async (id: string) => {
    if (!confirm('¿Eliminar este proveedor?')) return
    await supabase.from('suppliers').delete().eq('id', id)
    fetchData()
  }

  const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Proveedores</h1>
      </div>

      <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">Proveedores</p>
            <p className="text-xs text-[var(--ink-tertiary)]">{suppliers.length} proveedor{suppliers.length !== 1 ? 'es' : ''}</p>
          </div>
          <Button size="sm" onClick={openNew}>
            <Plus size={14} /> Agregar
          </Button>
        </div>
        {isLoading ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-[var(--ink-tertiary)]">Cargando...</p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Building2 size={32} className="mx-auto mb-2 text-[var(--ink-muted)]" />
            <p className="text-sm text-[var(--ink-tertiary)]">No hay proveedores registrados</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={openNew}>
              <Plus size={14} /> Agregar primer proveedor
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {suppliers.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--surface-2)]/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Building2 size={14} className="text-[var(--ink-tertiary)] shrink-0" />
                    <p className="text-sm font-medium text-[var(--ink)] truncate">{s.name}</p>
                  </div>
                  <p className="text-xs text-[var(--ink-tertiary)] mt-0.5">
                    {s.contact && `${s.contact}`}
                    {s.email && ` · ${s.email}`}
                    {s.phone && ` · ${s.phone}`}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1 text-[var(--ink-tertiary)] hover:text-[var(--tint)] hover:bg-[var(--tint-light)] rounded-[var(--radius-sm)] cursor-pointer transition-colors"
                    title="Editar"
                  >
                    <Edit size={14} />
                  </button>
                  <button
                    onClick={() => deleteSupplier(s.id)}
                    className="p-1 text-[var(--ink-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] rounded-[var(--radius-sm)] cursor-pointer transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Contacto" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          <Input label="Correo" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit">{editingSupplier ? 'Guardar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
