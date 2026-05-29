'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Package } from 'lucide-react'
import type { Supplier } from '@/types/database'

export default function SettingsPage() {
  const supabase = createClient()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', contact: '', email: '', phone: '' })
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchSuppliers = async () => {
    const { data } = await supabase.from('suppliers').select('*').order('name')
    if (data) setSuppliers(data)
  }

  useEffect(() => { fetchSuppliers() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editingId) {
      await supabase.from('suppliers').update(form).eq('id', editingId)
    } else {
      await supabase.from('suppliers').insert(form)
    }
    setForm({ name: '', contact: '', email: '', phone: '' })
    setEditingId(null)
    setShowForm(false)
    fetchSuppliers()
  }

  const handleEdit = (s: Supplier) => {
    setForm({ name: s.name, contact: s.contact || '', email: s.email || '', phone: s.phone || '' })
    setEditingId(s.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proveedor?')) return
    await supabase.from('suppliers').delete().eq('id', id)
    fetchSuppliers()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Configuración</h1>
        <Button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ name: '', contact: '', email: '', phone: '' }) }}>
          {showForm ? 'Cancelar' : 'Agregar Proveedor'}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-6">
          <h2 className="text-sm font-semibold text-[var(--ink)] mb-4">{editingId ? 'Editar' : 'Nuevo'} Proveedor</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Contacto" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
            <Input label="Correo" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <div className="flex justify-end">
              <Button type="submit">{editingId ? 'Guardar' : 'Crear'}</Button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-2">
        {suppliers.length === 0 ? (
          <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-6 text-center text-sm text-[var(--ink-tertiary)]">
            No hay proveedores registrados
          </div>
        ) : (
          suppliers.map((s) => (
            <div key={s.id} className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-tertiary)]">
                  <Package size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">{s.name}</p>
                  <p className="text-xs text-[var(--ink-tertiary)]">{s.contact || s.email || s.phone || '—'}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(s)} className="p-1.5 text-[var(--ink-tertiary)] hover:text-[var(--tint)] hover:bg-[var(--tint-light)] rounded-[var(--radius-sm)] cursor-pointer transition-colors text-xs">Editar</button>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 text-[var(--ink-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] rounded-[var(--radius-sm)] cursor-pointer transition-colors text-xs">Eliminar</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
