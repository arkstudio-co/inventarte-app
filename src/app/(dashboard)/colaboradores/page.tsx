'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Plus, UserCheck, Package, Undo2, DollarSign, FileText, ExternalLink, Pencil, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { DateFilter } from '@/components/ui/DateFilter'
import type { DateFilterState } from '@/components/ui/DateFilter'
import type { Seller, Return, Payment, Product, Remision } from '@/types/database'

export default function ColaboradoresPage() {
  const supabase = createClient()
  const [sellers, setSellers] = useState<Seller[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [filter, setFilter] = useState<DateFilterState>({
    mode: 'month',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    customStart: '',
    customEnd: '',
  })

  const fetchSellers = async () => {
    const { data } = await supabase.from('sellers').select('*').order('name')
    if (data) setSellers(data)
  }

  const fetchProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('is_active', true).order('name')
    if (data) setProducts(data)
  }

  useEffect(() => {
    fetchSellers()
    fetchProducts()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Colaboradores</h1>
        <div className="flex items-center gap-2">
          <DateFilter value={filter} onChange={setFilter} />
          <CreateSellerModal onCreated={fetchSellers} />
        </div>
      </div>

      {sellers.length === 0 ? (
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-8 text-center">
          <UserCheck size={40} className="mx-auto mb-3 text-[var(--ink-muted)]" />
          <p className="text-sm text-[var(--ink-tertiary)]">No hay colaboradores registrados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sellers.map((seller) => (
            <SellerCard
              key={seller.id}
              seller={seller}
              products={products}
              onUpdate={fetchSellers}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ========== SELLER CARD ========== */

function SellerCard({ seller, products, onUpdate }: {
  seller: Seller
  products: Product[]
  onUpdate: () => void
}) {
  const supabase = createClient()
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [returns, setReturns] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [remisiones, setRemisiones] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('remisiones').select('total_amount, delivery_type').eq('seller_id', seller.id),
      supabase.from('payments').select('amount').eq('seller_id', seller.id),
      supabase.from('returns').select('quantity, products(price)').eq('seller_id', seller.id),
    ]).then(([remRes, pRes, rRes]) => {
      if (remRes.data) setRemisiones(remRes.data)
      if (pRes.data) setPayments(pRes.data)
      if (rRes.data) setReturns(rRes.data)
    })
  }, [])

  const fetchDetails = async () => {
    setLoading(true)
    const [rRes, pRes, remRes] = await Promise.all([
      supabase.from('returns').select('*, products(*)').eq('seller_id', seller.id).order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('seller_id', seller.id).order('created_at', { ascending: false }),
      supabase.from('remisiones').select('*, remision_items(*)').eq('seller_id', seller.id).order('created_at', { ascending: false }),
    ])
    if (rRes.data) setReturns(rRes.data)
    if (pRes.data) setPayments(pRes.data)
    if (remRes.data) setRemisiones(remRes.data)
    setLoading(false)
  }

  const toggleExpand = () => {
    if (!expanded) fetchDetails()
    setExpanded(!expanded)
  }

  const totalPending = remisiones
    .filter((r) => r.delivery_type === 'pending')
    .reduce((s, r) => s + r.total_amount, 0)

  const totalReturnsVal = returns.reduce((s, r) => s + (r.quantity * (r.products?.price || 0)), 0)
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0)
  const balance = totalPending - totalReturnsVal - totalPaid

  const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden">
      <button
        onClick={toggleExpand}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--surface-2)]/50 transition-colors cursor-pointer text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full bg-[var(--tint-light)] flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-[var(--tint)]">
              {seller.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--ink)] truncate">{seller.name}</p>
            <p className="text-xs text-[var(--ink-tertiary)]">{seller.email || seller.phone || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className={`text-sm font-bold ${balance > 0 ? 'text-[var(--danger)]' : balance < 0 ? 'text-[var(--success)]' : 'text-[var(--ink-tertiary)]'}`}>
              {balance > 0 ? `Debe ${formatCurrency(balance)}` : balance < 0 ? `A favor ${formatCurrency(Math.abs(balance))}` : 'Al día'}
            </p>
          </div>
          {expanded ? <ChevronDown size={18} className="text-[var(--ink-tertiary)]" /> : <ChevronRight size={18} className="text-[var(--ink-tertiary)]" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border-subtle)] px-4 py-3 space-y-4">
          {loading ? (
            <p className="text-sm text-[var(--ink-tertiary)]">Cargando...</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <AssignProductModal sellerId={seller.id} products={products} onAssigned={() => { fetchDetails(); onUpdate() }} />
                <RegisterReturnModal sellerId={seller.id} products={products} onRegistered={() => { fetchDetails(); onUpdate() }} />
                <RegisterPaymentModal sellerId={seller.id} onRegistered={() => { fetchDetails(); onUpdate() }} />
                <EditSellerModal seller={seller} onUpdated={onUpdate} />
                <button
                  onClick={async () => {
                    if (!confirm('¿Eliminar este colaborador?')) return
                    await supabase.from('sellers').delete().eq('id', seller.id)
                    onUpdate()
                  }}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--surface-2)] text-[var(--ink-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] cursor-pointer transition-colors"
                >
                  <Trash2 size={12} /> Eliminar
                </button>
              </div>

              <div className="grid lg:grid-cols-4 gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase mb-2 flex items-center gap-1">
                    <FileText size={14} /> Remisiones ({remisiones.length})
                  </h4>
                  {remisiones.length === 0 ? (
                    <p className="text-xs text-[var(--ink-muted)]">Sin registros</p>
                  ) : (
                    <div className="space-y-1">
                      {remisiones.map((r) => (
                        <div key={r.id} className="text-xs border-b border-[var(--border-subtle)] last:border-0 py-1 space-y-0.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--ink)]">
                              {new Date(r.created_at).toLocaleDateString('es-CO')} • {r.remision_number}
                            </span>
                            <button
                              onClick={() => router.push(`/colaboradores/remisiones/${r.id}`)}
                              className="text-[var(--tint)] hover:underline cursor-pointer shrink-0"
                            >
                              <ExternalLink size={12} />
                            </button>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium">{formatCurrency(r.total_amount)}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              r.delivery_type === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {r.delivery_type === 'paid' ? 'Pagado' : 'Pendiente'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase mb-2 flex items-center gap-1">
                    <Package size={14} /> Productos tomados ({remisiones.flatMap((r) => r.remision_items || []).length})
                  </h4>
                  {remisiones.flatMap((r) => r.remision_items || []).length === 0 ? (
                    <p className="text-xs text-[var(--ink-muted)]">Sin registros</p>
                  ) : (
                    <div className="space-y-1">
                      {remisiones.flatMap((r) =>
                        (r.remision_items || []).map((item: any) => ({ ...item, delivery_type: r.delivery_type, date: r.created_at }))
                      ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((item) => (
                        <div key={item.id} className="text-xs flex justify-between py-1 border-b border-[var(--border-subtle)] last:border-0">
                          <span className="text-[var(--ink)]">
                            {new Date(item.date).toLocaleDateString('es-CO')} • {item.product_name} x{item.quantity}
                          </span>
                          <span className={item.delivery_type === 'pending' ? 'text-[var(--danger)] font-medium' : 'text-[var(--ink-tertiary)]'}>
                            {item.delivery_type === 'pending' ? formatCurrency(item.subtotal) : 'Pagado'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase mb-2 flex items-center gap-1">
                    <Undo2 size={14} /> Devoluciones ({returns.length})
                  </h4>
                  {returns.length === 0 ? (
                    <p className="text-xs text-[var(--ink-muted)]">Sin registros</p>
                  ) : (
                    <div className="space-y-1">
                      {returns.map((r) => (
                        <div key={r.id} className="text-xs flex justify-between py-1 border-b border-[var(--border-subtle)] last:border-0">
                          <span className="text-[var(--ink)]">
                            {new Date(r.created_at).toLocaleDateString('es-CO')} • {r.products?.name} x{r.quantity}
                          </span>
                          <span className="text-[var(--success)] font-medium">
                            -{formatCurrency(r.quantity * (r.products?.price || 0))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase mb-2 flex items-center gap-1">
                    <DollarSign size={14} /> Pagos ({payments.length})
                  </h4>
                  {payments.length === 0 ? (
                    <p className="text-xs text-[var(--ink-muted)]">Sin registros</p>
                  ) : (
                    <div className="space-y-1">
                      {payments.map((p) => (
                        <div key={p.id} className="text-xs flex justify-between py-1 border-b border-[var(--border-subtle)] last:border-0">
                          <span className="text-[var(--ink)]">
                            {new Date(p.created_at).toLocaleDateString('es-CO')}
                            {p.observations && ` • ${p.observations}`}
                          </span>
                          <span className="text-[var(--success)] font-medium">-{formatCurrency(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-0)] border border-[var(--border-subtle)] flex items-center justify-between text-sm">
                <span className="text-[var(--ink-secondary)]">Balance final</span>
                <span className={`font-bold ${balance > 0 ? 'text-[var(--danger)]' : balance < 0 ? 'text-[var(--success)]' : 'text-[var(--ink-tertiary)]'}`}>
                  {balance > 0 ? `Debe ${formatCurrency(balance)}` : balance < 0 ? `A favor ${formatCurrency(Math.abs(balance))}` : 'Al día'}
                </span>
              </div>

              <div className="text-xs text-[var(--ink-muted)]">
                Pendiente: {formatCurrency(totalPending)} — Dev: {formatCurrency(totalReturnsVal)} — Pagos: {formatCurrency(totalPaid)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ========== MODALS ========== */

function CreateSellerModal({ onCreated }: { onCreated: () => void }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('sellers').insert({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      notes: form.notes || null,
    })
    setSaving(false)
    setOpen(false)
    setForm({ name: '', email: '', phone: '', notes: '' })
    onCreated()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}><Plus size={16} /> Agregar Vendedor</Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Nuevo Colaborador">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Correo electrónico" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Notas</label>
            <textarea
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function EditSellerModal({ seller, onUpdated }: { seller: Seller; onUpdated: () => void }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: seller.name, email: seller.email || '', phone: seller.phone || '', notes: seller.notes || '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    await supabase.from('sellers').update({
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      notes: form.notes || null,
    }).eq('id', seller.id)
    setSaving(false)
    setOpen(false)
    onUpdated()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--surface-2)] text-[var(--ink-secondary)] hover:text-[var(--tint)] cursor-pointer transition-colors"
      >
        <Pencil size={12} /> Editar
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={`Editar ${seller.name}`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Correo electrónico" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Notas</label>
            <textarea
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function AssignProductModal({ sellerId, products, onAssigned }: { sellerId: string; products: Product[]; onAssigned: () => void }) {
  const supabase = createClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<{
    product_id: string
    quantity: number | ''
    delivery_type: 'paid' | 'pending'
    payment_method: 'cash' | 'transfer'
    bank_account: string
    card_last_four: string
    payment_observations: string
  }>({
    product_id: '',
    quantity: '',
    delivery_type: 'pending',
    payment_method: 'cash',
    bank_account: '',
    card_last_four: '',
    payment_observations: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedProduct = products.find((p) => p.id === form.product_id)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const qty = form.quantity === '' ? 0 : form.quantity
    if (!form.product_id || qty < 1) return
    if (form.delivery_type === 'paid' && form.payment_method === 'transfer' && (!form.bank_account.trim() || form.card_last_four.length !== 4)) {
      setError('Completa la cuenta bancaria y los últimos 4 dígitos')
      return
    }
    setSaving(true)
    setError('')

    const seller = await supabase.from('sellers').select('name, email').eq('id', sellerId).single()

    const payload: any = {
      seller_id: sellerId,
      person_name: seller.data?.name || '',
      person_email: seller.data?.email || '',
      delivery_type: form.delivery_type,
      notes: null,
      items: [{
        product_id: form.product_id,
        product_name: selectedProduct?.name || '',
        quantity: qty,
        unit_price: selectedProduct?.price || 0,
      }],
    }

    if (form.delivery_type === 'paid') {
      payload.payment_method = form.payment_method
      payload.bank_account = form.bank_account || null
      payload.card_last_four = form.card_last_four || null
      payload.payment_observations = form.payment_observations || null
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
    setOpen(false)
    setForm({ product_id: '', quantity: '', delivery_type: 'pending', payment_method: 'cash', bank_account: '', card_last_four: '', payment_observations: '' })
    onAssigned()
    router.push(`/colaboradores/remisiones/${remision.id}`)
  }

  const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--surface-2)] text-[var(--ink-secondary)] hover:text-[var(--tint)] cursor-pointer transition-colors"
      >
        <Package size={12} /> Asignar producto
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Asignar Producto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            value={form.product_id}
            onChange={(e) => setForm({ ...form, product_id: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            required
          >
            <option value="">Seleccionar producto</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)} c/u</option>
            ))}
          </select>

          <Input label="Cantidad" type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value === '' ? '' : Number(e.target.value) })} required />

          <select
            value={form.delivery_type}
            onChange={(e) => setForm({ ...form, delivery_type: e.target.value as 'paid' | 'pending' })}
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          >
            <option value="paid">Producto pagado</option>
            <option value="pending">Producto por pagar</option>
          </select>

          {form.delivery_type === 'paid' && (
            <>
              <div className="border-t border-[var(--border-subtle)] pt-3">
                <p className="text-xs font-semibold text-[var(--ink-tertiary)] uppercase mb-3">Información del pago</p>

                <select
                  value={form.payment_method}
                  onChange={(e) => setForm({ ...form, payment_method: e.target.value as 'cash' | 'transfer' })}
                  className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                >
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                </select>

                {form.payment_method === 'transfer' && (
                  <div className="space-y-3 mt-3">
                    <Input
                      label="Cuenta bancaria"
                      value={form.bank_account}
                      onChange={(e) => setForm({ ...form, bank_account: e.target.value })}
                      required
                    />
                    <Input
                      label="Últimos 4 dígitos de la tarjeta"
                      value={form.card_last_four}
                      onChange={(e) => setForm({ ...form, card_last_four: e.target.value.slice(0, 4) })}
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
                    value={form.payment_observations}
                    onChange={(e) => setForm({ ...form, payment_observations: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="text-sm text-[var(--danger)] bg-[var(--danger-light)] px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--danger)]/20">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Asignando...' : 'Asignar'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function RegisterReturnModal({ sellerId, products, onRegistered }: { sellerId: string; products: Product[]; onRegistered: () => void }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ product_id: '', quantity: '' as number | '', observations: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const qty = form.quantity === '' ? 0 : form.quantity
    if (!form.product_id || qty < 1) return
    setSaving(true)
    await supabase.from('returns').insert({
      seller_id: sellerId,
      product_id: form.product_id,
      quantity: qty,
      observations: form.observations || null,
    })
    setSaving(false)
    setOpen(false)
    setForm({ product_id: '', quantity: '', observations: '' })
    onRegistered()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--surface-2)] text-[var(--ink-secondary)] hover:text-[var(--accent)] cursor-pointer transition-colors"
      >
        <Undo2 size={12} /> Registrar devolución
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Registrar Devolución">
        <form onSubmit={handleSubmit} className="space-y-4">
          <select
            value={form.product_id}
            onChange={(e) => setForm({ ...form, product_id: e.target.value })}
            className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            required
          >
            <option value="">Seleccionar producto</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Input label="Cantidad" type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value === '' ? '' : Number(e.target.value) })} required />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Observaciones</label>
            <textarea
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
              rows={2}
              value={form.observations}
              onChange={(e) => setForm({ ...form, observations: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Registrar'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function RegisterPaymentModal({ sellerId, onRegistered }: { sellerId: string; onRegistered: () => void }) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ amount: '' as number | '', observations: '', payment_method: 'cash' as 'cash' | 'transfer', bank_account: '', card_last_four: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amt = form.amount === '' ? 0 : form.amount
    if (amt <= 0) return
    if (form.payment_method === 'transfer' && (!form.bank_account.trim() || form.card_last_four.length !== 4)) return
    setSaving(true)
    await supabase.from('payments').insert({
      seller_id: sellerId,
      amount: amt,
      payment_method: form.payment_method,
      bank_account: form.payment_method === 'transfer' ? form.bank_account.trim() : null,
      card_last_four: form.payment_method === 'transfer' ? form.card_last_four : null,
      observations: form.observations || null,
    })
    setSaving(false)
    setOpen(false)
    setForm({ amount: '', observations: '', payment_method: 'cash', bank_account: '', card_last_four: '' })
    onRegistered()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--surface-2)] text-[var(--ink-secondary)] hover:text-[var(--success)] cursor-pointer transition-colors"
      >
        <DollarSign size={12} /> Registrar pago
      </button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Registrar Pago">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Monto" type="number" step="0.01" min={1} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value === '' ? '' : Number(e.target.value) })} required />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Método de pago</label>
            <select
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value as 'cash' | 'transfer' })}
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="cash">Efectivo</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>

          {form.payment_method === 'transfer' && (
            <>
              <Input label="Cuenta bancaria" value={form.bank_account} onChange={(e) => setForm({ ...form, bank_account: e.target.value })} required />
              <Input label="Últimos 4 dígitos de la tarjeta" value={form.card_last_four} onChange={(e) => setForm({ ...form, card_last_four: e.target.value.slice(0, 4) })} maxLength={4} required />
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Observaciones</label>
            <textarea
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
              rows={2}
              value={form.observations}
              onChange={(e) => setForm({ ...form, observations: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Registrar'}</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
