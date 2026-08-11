'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { useCompany } from '@/providers/CompanyProvider'
import { PurchaseOrderModal } from '@/components/inventory/PurchaseOrderModal'
import { WithdrawalModal } from '@/components/inventory/WithdrawalModal'

import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  RefreshCw,
  Eye,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  TrendingDown,
  DollarSign,
  Building2,
  Loader2,
} from 'lucide-react'
import type { PurchaseOrder, Supplier } from '@/types/database'

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: 'Borrador', color: 'var(--ink-tertiary)', bg: 'var(--surface-2)' },
  sent: { label: 'Enviada', color: 'var(--accent)', bg: 'var(--accent)/10' },
  partial: { label: 'Parcial', color: 'var(--warning)', bg: 'var(--warning)/10' },
  received: { label: 'Recibida', color: 'var(--success)', bg: 'var(--success)/10' },
  cancelled: { label: 'Cancelada', color: 'var(--danger)', bg: 'var(--danger)/10' },
}

export default function PurchaseOrdersPage() {
  const router = useRouter()
  const supabase = createClient()
  const { companyId } = useCompany()

  const [orders, setOrders] = useState<(PurchaseOrder & { suppliers?: Supplier | null })[]>([])
  const [products, setProducts] = useState<{ id: string; name: string; sku: string; stock: number; min_stock: number; cost: number }[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null)

  const fetchData = async () => {
    setIsLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setIsLoading(false); setError('Debes iniciar sesión'); return }

    const [ordersRes, productsRes] = await Promise.all([
      supabase.from('purchase_orders').select('*, suppliers(*), items:purchase_order_items(*)').order('created_at', { ascending: false }),
      supabase.from('products').select('id, name, sku, stock, min_stock, cost').eq('is_active', true).order('name'),
    ])

    if (ordersRes.error) { setError(ordersRes.error.message); setIsLoading(false); return }
    setOrders(ordersRes.data || [])
    if (productsRes.data) setProducts(productsRes.data)
    setIsLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false
      if (search) {
        const term = search.toLowerCase()
        if (!o.order_number.toLowerCase().includes(term) &&
            !(o.suppliers?.name || '').toLowerCase().includes(term)) return false
      }
      return true
    })
  }, [orders, statusFilter, search])

  const changeStatus = async (id: string, status: string) => {
    const { error: err } = await supabase.from('purchase_orders').update({ status }).eq('id', id)
    if (err) { setError(err.message); return }
    fetchData()
  }

  const receiveOrder = async (order: PurchaseOrder & { items?: any[] }) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const items = order.items || []
    const allReceived = items.every((i: any) => i.received_quantity >= i.quantity)
    if (allReceived) {
      await changeStatus(order.id, 'received')
      return
    }

    // Create stock entries for unreceived items
    for (const item of items) {
      const pending = item.quantity - item.received_quantity
      if (pending <= 0) continue

      const { error: entryErr } = await supabase.from('stock_entries').insert({
        product_id: item.product_id, quantity: pending, unit_cost: item.unit_cost ?? 0, company_id: companyId,
        payment_status: 'pending', observations: `OC ${order.order_number}: ${item.product_name}`,
        created_by: user.id,
      })
      if (entryErr) { setError(entryErr.message); return }

      await supabase.rpc('increment_stock', { p_product_id: item.product_id, p_quantity: pending })
      await supabase.from('purchase_order_items').update({
        received_quantity: item.quantity,
      }).eq('id', item.id)
    }

    await changeStatus(order.id, 'received')
    fetchData()
  }

  const autoGenerateFromLowStock = async () => {
    const lowStockProducts = products.filter((p) => p.stock <= p.min_stock && p.stock > 0)
    if (lowStockProducts.length === 0) { setError('No hay productos con stock bajo'); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Debes iniciar sesión'); return }

    const { data: orderNumber } = await supabase.rpc('generate_order_number')
    const orderNum = orderNumber || `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0001`

    const { data: newOrder, error: orderErr } = await supabase.from('purchase_orders').insert({
      order_number: orderNum, supplier_id: null, notes: 'Auto-generada por stock bajo', company_id: companyId,
      created_by: user.id,
    }).select().single()
    if (orderErr) { setError(orderErr.message); return }

    const orderItems = lowStockProducts.map((p) => {
      const qty = p.min_stock * 2 - p.stock
      return {
        order_id: newOrder.id, product_id: p.id, product_name: p.name,
        quantity: Math.max(qty, 1), unit_cost: p.cost, subtotal: Math.max(qty, 1) * p.cost,
        received_quantity: 0,
      }
    })

    const { error: itemsErr } = await supabase.from('purchase_order_items').insert(orderItems)
    if (itemsErr) { setError(itemsErr.message); return }

    fetchData()
  }

  const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const stats = useMemo(() => {
    const total = orders.reduce((s, o) => s + o.total_cost, 0)
    const pending = orders.filter((o) => o.status === 'draft' || o.status === 'sent')
    const pendingTotal = pending.reduce((s, o) => s + o.total_cost, 0)
    return {
      total: orders.length, totalCost: total,
      pending: pending.length, pendingTotal,
      received: orders.filter((o) => o.status === 'received').length,
    }
  }, [orders])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between"><h1 className="text-xl font-semibold text-[var(--ink)]">Órdenes de Compra</h1></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4 animate-pulse">
              <div className="h-3 w-16 bg-[var(--surface-2)] rounded mb-2" />
              <div className="h-6 w-12 bg-[var(--surface-2)] rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] animate-pulse p-12" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Órdenes de Compra</h1>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-8 text-center">
          <AlertTriangle size={40} className="mx-auto mb-3 text-[var(--danger)]" />
          <p className="text-sm text-[var(--danger)] mb-4">{error}</p>
          <Button onClick={fetchData}><RefreshCw size={16} /> Reintentar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--ink)]">Órdenes de Compra</h1>
          <p className="text-sm text-[var(--ink-tertiary)] mt-0.5">{stats.total} órdenes &middot; {formatCurrency(stats.totalCost)} total</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={autoGenerateFromLowStock}>
            <Package size={14} /> Auto-generar
          </Button>
          <Button size="sm" onClick={() => { setEditingOrder(null); setShowModal(true) }}>
            <Plus size={14} /> Nueva Orden
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
            <FileText size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Totales</span>
          </div>
          <p className="text-lg font-semibold text-[var(--ink)]">{stats.total}</p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
            <DollarSign size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Valor Total</span>
          </div>
          <p className="text-lg font-semibold text-[var(--ink)]">{formatCurrency(stats.totalCost)}</p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
            <Send size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Pendientes</span>
          </div>
          <p className={`text-lg font-semibold ${stats.pending > 0 ? 'text-[var(--warning)]' : 'text-[var(--ink)]'}`}>
            {stats.pending} / {formatCurrency(stats.pendingTotal)}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
          <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
            <CheckCircle size={14} />
            <span className="text-xs font-medium uppercase tracking-wide">Recibidas</span>
          </div>
          <p className="text-lg font-semibold text-[var(--success)]">{stats.received}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)]" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="Buscar por número o proveedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors appearance-none cursor-pointer"
          >
            <option value="all">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="sent">Enviada</option>
            <option value="partial">Parcial</option>
            <option value="received">Recibida</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {filteredOrders.length === 0 ? (
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-8 text-center">
          <Package size={40} className="mx-auto mb-3 text-[var(--ink-muted)]" />
          <p className="text-sm text-[var(--ink-tertiary)]">
            {statusFilter !== 'all' || search ? 'No hay órdenes con los filtros actuales' : 'No hay órdenes de compra'}
          </p>
          {statusFilter === 'all' && !search && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button onClick={() => { setEditingOrder(null); setShowModal(true) }}><Plus size={14} /> Crear primera orden</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Orden</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Proveedor</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Productos</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider hidden md:table-cell">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider hidden lg:table-cell">Fecha</th>
                  <th className="px-4 py-3 w-[120px]" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredOrders.map((order) => {
                  const cfg = statusConfig[order.status] || statusConfig.draft
                  const itemCount = (order.items || []).length
                  const receivedCount = (order.items || []).filter((i: any) => i.received_quantity > 0).length
                  return (
                    <tr key={order.id} className="group transition-colors hover:bg-[var(--surface-2)]/30">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-[var(--ink)]">{order.order_number}</span>
                        {order.notes && <span className="text-[11px] text-[var(--ink-muted)] block max-w-[200px] truncate">{order.notes}</span>}
                      </td>
                      <td className="px-4 py-3">
                        {order.suppliers ? (
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-[var(--ink-tertiary)] shrink-0" />
                            <span className="text-sm text-[var(--ink-secondary)]">{order.suppliers.name}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-[var(--ink-muted)] italic">Sin proveedor</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold"
                          style={{ color: cfg.color, backgroundColor: cfg.bg }}
                        >
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-[var(--ink)]">{itemCount} prod.</span>
                        {receivedCount > 0 && receivedCount < itemCount && (
                          <span className="text-[11px] text-[var(--warning)] ml-1">({receivedCount} rec.)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <span className="text-sm font-semibold text-[var(--ink)]">{formatCurrency(order.total_cost)}</span>
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        <span className="text-xs text-[var(--ink-muted)] font-mono">
                          {new Date(order.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {order.status === 'draft' && (
                            <>
                              <button
                                onClick={() => { setEditingOrder(order as PurchaseOrder); setShowModal(true) }}
                                className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                                title="Editar"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                onClick={() => changeStatus(order.id, 'sent')}
                                className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                                title="Marcar como enviada"
                              >
                                <Send size={14} />
                              </button>
                              <button
                                onClick={() => changeStatus(order.id, 'cancelled')}
                                className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10 rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                                title="Cancelar orden"
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                          {(order.status === 'sent' || order.status === 'partial') && (
                            <button
                              onClick={() => receiveOrder(order as any)}
                              className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--success)] hover:bg-[var(--success)]/10 rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                              title="Recibir"
                            >
                              <CheckCircle size={14} />
                            </button>
                          )}
                          {order.status === 'draft' && (
                            <button
                              onClick={() => {
                                // Quick entry after receiving
                                receiveOrder(order as any)
                              }}
                              className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--success)] hover:bg-[var(--success)]/10 rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                              title="Recibir todo"
                            >
                              <TrendingDown size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--ink-muted)]">
            <span>{filteredOrders.length} órdenes</span>
          </div>
        </div>
      )}

      {/* Modal */}
      <PurchaseOrderModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingOrder(null) }}
        onSuccess={() => { setShowModal(false); setEditingOrder(null); fetchData() }}
        order={editingOrder}
      />

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 right-4 p-3 rounded-[var(--radius-md)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-sm text-[var(--danger)] shadow-lg max-w-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-[var(--danger)] hover:text-[var(--danger)]/80 cursor-pointer">&times;</button>
        </div>
      )}
    </div>
  )
}
