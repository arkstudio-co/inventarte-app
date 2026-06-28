'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Package, ChevronDown, ChevronRight, DollarSign, CheckCircle } from 'lucide-react'
import type { Supplier } from '@/types/database'

export default function SettingsPage() {
  const supabase = createClient()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', contact: '', email: '', phone: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const fetchData = async () => {
    const [suppliersRes, entriesRes] = await Promise.all([
      supabase.from('suppliers').select('*').order('name'),
      supabase.from('stock_entries')
        .select('*, products!inner(id, name, cost, supplier_id, suppliers!inner(id, name))')
        .order('created_at', { ascending: false }),
    ])
    if (suppliersRes.data) setSuppliers(suppliersRes.data)
    if (entriesRes.data) setEntries(entriesRes.data)
  }

  useEffect(() => { fetchData() }, [])

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
    fetchData()
  }

  const handleEdit = (s: Supplier) => {
    setForm({ name: s.name, contact: s.contact || '', email: s.email || '', phone: s.phone || '' })
    setEditingId(s.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proveedor?')) return
    await supabase.from('suppliers').delete().eq('id', id)
    fetchData()
  }

  const markAsPaid = async (entryId: string) => {
    await supabase.from('stock_entries').update({ payment_status: 'paid' }).eq('id', entryId)
    fetchData()
  }

  const getEntriesForSupplier = (supplierId: string) => {
    return entries.filter((e) => e.products?.suppliers?.id === supplierId)
  }

  const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const totalPendingForSupplier = (supplierId: string) => {
    return getEntriesForSupplier(supplierId)
      .filter((e) => e.payment_status === 'pending')
      .reduce((sum, e) => sum + (e.quantity * (e.products?.cost || 0)), 0)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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

      <div className="space-y-3">
        {suppliers.length === 0 ? (
          <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-6 text-center text-sm text-[var(--ink-tertiary)]">
            No hay proveedores registrados
          </div>
        ) : (
          suppliers.map((s) => {
            const supplierEntries = getEntriesForSupplier(s.id)
            const isExpanded = expanded[s.id]
            const pendingTotal = totalPendingForSupplier(s.id)

            return (
              <div key={s.id} className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden">
                <button
                  onClick={() => setExpanded((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                  className="w-full flex items-center justify-between p-4 hover:bg-[var(--surface-2)]/50 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--surface-2)] flex items-center justify-center text-[var(--ink-tertiary)] shrink-0">
                      <Package size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--ink)]">{s.name}</p>
                      <p className="text-xs text-[var(--ink-tertiary)]">
                        {supplierEntries.length} entrada{`${supplierEntries.length !== 1 ? 's' : ''}`}
                        {pendingTotal > 0 && ` · ${formatCurrency(pendingTotal)} pendiente`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {pendingTotal > 0 && (
                      <span className="text-xs font-medium text-[var(--warning)]">{formatCurrency(pendingTotal)}</span>
                    )}
                    {isExpanded ? <ChevronDown size={18} className="text-[var(--ink-tertiary)]" /> : <ChevronRight size={18} className="text-[var(--ink-tertiary)]" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[var(--border-subtle)]">
                    {supplierEntries.length === 0 ? (
                      <div className="p-4 text-center">
                        <p className="text-xs text-[var(--ink-muted)]">No hay entradas de stock para este proveedor</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--border-subtle)]">
                        {supplierEntries.map((entry) => (
                          <div key={entry.id} className="px-4 py-3 flex items-center justify-between gap-4">
                            <div className="min-w-0 flex-1 grid grid-cols-3 sm:grid-cols-4 gap-2">
                              <div className="col-span-1 sm:col-span-2">
                                <p className="text-sm font-medium text-[var(--ink)] truncate">{entry.products?.name}</p>
                              </div>
                              <div>
                                <p className="text-xs text-[var(--ink-tertiary)] uppercase">Cant</p>
                                <p className="text-sm text-[var(--ink)]">{entry.quantity} und</p>
                              </div>
                              <div>
                                <p className="text-xs text-[var(--ink-tertiary)] uppercase">Fecha</p>
                                <p className="text-sm text-[var(--ink)]">{new Date(entry.created_at).toLocaleDateString('es-CO')}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {entry.payment_status === 'paid' ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--success)]">
                                  <CheckCircle size={14} /> Pagado
                                </span>
                              ) : (
                                <button
                                  onClick={() => markAsPaid(entry.id)}
                                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--warning)] hover:text-[var(--success)] hover:underline cursor-pointer transition-colors"
                                >
                                  <DollarSign size={14} /> Pendiente
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-[var(--border-subtle)] px-4 py-2 flex items-center justify-between gap-2">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(s)}
                          className="text-xs px-2 py-1 rounded-[var(--radius-sm)] text-[var(--ink-tertiary)] hover:text-[var(--tint)] hover:bg-[var(--tint-light)] cursor-pointer transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="text-xs px-2 py-1 rounded-[var(--radius-sm)] text-[var(--ink-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] cursor-pointer transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                      <p className="text-xs text-[var(--ink-tertiary)]">
                        Total pendiente: <span className="font-semibold text-[var(--warning)]">{formatCurrency(pendingTotal)}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
