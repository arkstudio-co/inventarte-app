'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { StockAdjustmentModal } from '@/components/inventory/StockAdjustmentModal'

import {
  Plus,
  Search,
  AlertTriangle,
  RefreshCw,
  Eye,
  CheckCircle,
  BarChart3,
  Layers,
  DollarSign,
  Package,
  TrendingUp,
  TrendingDown,
  ChevronRight,
} from 'lucide-react'
import type { Product, StockAdjustment } from '@/types/database'

const abcConfig = {
  A: { label: 'A — Alto valor', color: 'var(--danger)', bg: 'var(--danger)/10', days: 30, description: '80% del valor, contar cada mes' },
  B: { label: 'B — Valor medio', color: 'var(--warning)', bg: 'var(--warning)/10', days: 90, description: '15% del valor, contar cada trimestre' },
  C: { label: 'C — Bajo valor', color: 'var(--success)', bg: 'var(--success)/10', days: 180, description: '5% del valor, contar cada 6 meses' },
}

export default function StockAdjustmentsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [products, setProducts] = useState<Product[]>([])
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined)
  const [adjustmentSearch, setAdjustmentSearch] = useState('')

  const fetchData = async () => {
    setIsLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setIsLoading(false); setError('Debes iniciar sesión'); return }

    const [productsRes, adjustmentsRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('stock_adjustments').select('*, products(name, sku, image_url)').order('created_at', { ascending: false }).limit(100),
    ])

    if (productsRes.error) { setError(productsRes.error.message); setIsLoading(false); return }
    setProducts(productsRes.data || [])
    if (adjustmentsRes.data) setAdjustments(adjustmentsRes.data)
    setIsLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  // ABC stats
  const abcStats = useMemo(() => {
    const activeProducts = products.filter((p) => p.abc_classification)
    const groups = { A: { count: 0, value: 0 }, B: { count: 0, value: 0 }, C: { count: 0, value: 0 } }
    for (const p of activeProducts) {
      const cls = p.abc_classification as 'A' | 'B' | 'C'
      if (groups[cls]) {
        groups[cls].count++
        groups[cls].value += p.stock * p.cost
      }
    }
    const totalValue = groups.A.value + groups.B.value + groups.C.value
    return { groups, totalValue, classified: activeProducts.length, unclassified: products.length - activeProducts.length }
  }, [products])

  // Cycle counting due
  const countDue = useMemo(() => {
    const now = Date.now()
    return products.filter((p) => {
      if (!p.abc_classification || p.abc_classification === 'C') return false
      if (!p.last_count_date) return true
      const interval = abcConfig[p.abc_classification as 'A' | 'B'].days * 86400000
      return now - new Date(p.last_count_date).getTime() > interval
    })
  }, [products])

  const markAsCounted = async (productId: string) => {
    const { error: err } = await supabase.from('products').update({ last_count_date: new Date().toISOString() }).eq('id', productId)
    if (!err) fetchData()
  }

  const runAbcCalculation = async () => {
    setError('')
    const { error: rpcErr } = await supabase.rpc('calculate_abc_classification')
    if (rpcErr) { setError(rpcErr.message); return }
    fetchData()
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const filteredAdjustments = useMemo(() => {
    if (!adjustmentSearch) return adjustments
    const term = adjustmentSearch.toLowerCase()
    return adjustments.filter((a) => {
      const name = a.products?.name?.toLowerCase() || ''
      const sku = a.products?.sku?.toLowerCase() || ''
      const ref = a.reference?.toLowerCase() || ''
      const reason = a.reason?.toLowerCase() || ''
      return name.includes(term) || sku.includes(term) || ref.includes(term) || reason.includes(term)
    })
  }, [adjustments, adjustmentSearch])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between"><h1 className="text-xl font-semibold text-[var(--ink)]">Ajustes y Conteo Cíclico</h1></div>
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
        <h1 className="text-xl font-semibold text-[var(--ink)]">Ajustes y Conteo Cíclico</h1>
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
          <h1 className="text-xl font-semibold text-[var(--ink)]">Ajustes y Conteo Cíclico</h1>
          <p className="text-sm text-[var(--ink-tertiary)] mt-0.5">
            {abcStats.classified} productos clasificados &middot; {formatCurrency(abcStats.totalValue)} en valor ABC
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={runAbcCalculation}>
            <BarChart3 size={14} /> Recalcular ABC
          </Button>
          <Button size="sm" onClick={() => { setSelectedProductId(undefined); setShowModal(true) }}>
            <Plus size={14} /> Nuevo Ajuste
          </Button>
        </div>
      </div>

      {/* ABC Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {(Object.entries(abcConfig) as [string, typeof abcConfig['A']][]).map(([cls, cfg]) => {
          const group = abcStats.groups[cls as 'A' | 'B' | 'C']
          const pct = abcStats.totalValue > 0 ? (group.value / abcStats.totalValue) * 100 : 0
          return (
            <div key={cls} className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4" style={{ borderLeftColor: cfg.color, borderLeftWidth: 3 }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                <span className="text-xs text-[var(--ink-tertiary)]">{cfg.days} días</span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-lg font-bold text-[var(--ink)]">{group.count} prod.</p>
                  <p className="text-sm text-[var(--ink-secondary)]">{formatCurrency(group.value)}</p>
                </div>
                <span className="text-2xl font-bold" style={{ color: cfg.color }}>{pct.toFixed(0)}%</span>
              </div>
              <div className="mt-2 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Cycle Counting */}
        <div className="lg:col-span-1 space-y-4">
          {/* Count Due */}
          <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--ink)]">Conteo Pendiente</h3>
              <span className="text-xs text-[var(--ink-tertiary)]">{countDue.length} productos</span>
            </div>
            {countDue.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle size={32} className="mx-auto mb-2 text-[var(--success)]" />
                <p className="text-sm text-[var(--ink-tertiary)]">Todos los conteos están al día</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)] max-h-[400px] overflow-y-auto">
                {countDue.map((p) => (
                  <div key={p.id} className="px-4 py-2.5 flex items-center justify-between group hover:bg-[var(--surface-2)]/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <button
                        onClick={() => router.push(`/products/${p.id}`)}
                        className="text-sm font-medium text-[var(--ink)] hover:text-[var(--accent)] transition-colors cursor-pointer text-left truncate block"
                      >
                        {p.name}
                      </button>
                      <span className="text-[11px] text-[var(--ink-muted)] font-mono">{p.sku}</span>
                      <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${p.abc_classification === 'A' ? 'text-[var(--danger)] bg-[var(--danger)]/10' : 'text-[var(--warning)] bg-[var(--warning)]/10'}`}>
                        {p.abc_classification}
                      </span>
                      {p.last_count_date && (
                        <span className="text-[11px] text-[var(--ink-muted)] ml-2">Últ.: {formatDate(p.last_count_date)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                      <button
                        onClick={() => { setSelectedProductId(p.id); setShowModal(true) }}
                        className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                        title="Ajustar stock"
                      >
                        <TrendingUp size={13} />
                      </button>
                      <button
                        onClick={() => markAsCounted(p.id)}
                        className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--success)] hover:bg-[var(--success)]/10 rounded-[var(--radius-sm)] transition-colors cursor-pointer"
                        title="Marcar como contado"
                      >
                        <CheckCircle size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unclassified */}
          {abcStats.unclassified > 0 && (
            <div className="rounded-[var(--radius-md)] bg-[var(--warning)]/5 border border-[var(--warning)]/20 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-[var(--warning)]" />
                <span className="text-xs text-[var(--ink-secondary)]">{abcStats.unclassified} productos sin clasificar</span>
              </div>
              <Button variant="secondary" size="sm" onClick={runAbcCalculation}>
                Clasificar
              </Button>
            </div>
          )}
        </div>

        {/* Right: Adjustment History */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)]" />
            <input
              className="w-full pl-9 pr-3 py-2 text-sm rounded-[var(--radius-md)] bg-[var(--surface-1)] text-[var(--ink)] border border-[var(--border-default)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="Buscar ajustes por producto, SKU o referencia..."
              value={adjustmentSearch}
              onChange={(e) => setAdjustmentSearch(e.target.value)}
            />
          </div>

          {/* Table */}
          <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden">
            {filteredAdjustments.length === 0 ? (
              <div className="p-6 text-center">
                <Package size={32} className="mx-auto mb-2 text-[var(--ink-muted)]" />
                <p className="text-sm text-[var(--ink-tertiary)]">No hay ajustes registrados</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] bg-[var(--surface-2)]/50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Fecha</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Producto</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Tipo</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Cant.</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider hidden md:table-cell">Stock</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider hidden lg:table-cell">Motivo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider hidden xl:table-cell">Ref.</th>
                        <th className="px-4 py-3 w-[40px]" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)]">
                      {filteredAdjustments.map((adj) => (
                        <tr key={adj.id} className="group transition-colors hover:bg-[var(--surface-2)]/30">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-xs text-[var(--ink-secondary)] font-mono">
                              {formatDate(adj.created_at)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => router.push(`/products/${adj.product_id}`)}
                              className="text-sm font-medium text-[var(--ink)] hover:text-[var(--accent)] transition-colors cursor-pointer text-left"
                            >
                              {adj.products?.name || '(eliminado)'}
                            </button>
                            {adj.products?.sku && (
                              <span className="text-[11px] text-[var(--ink-muted)] font-mono ml-1.5">{adj.products.sku}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                              adj.adjustment_type === 'positive' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'
                            }`}>
                              {adj.adjustment_type === 'positive' ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              {adj.adjustment_type === 'positive' ? 'Entrada' : 'Salida'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`text-sm font-bold ${adj.adjustment_type === 'positive' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                              {adj.adjustment_type === 'positive' ? '+' : '-'}{adj.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center hidden md:table-cell">
                            <span className="text-xs text-[var(--ink-muted)] font-mono">
                              {adj.stock_before} → {adj.stock_after}
                            </span>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="text-xs text-[var(--ink-secondary)]">{adj.reason_code}</span>
                            {adj.reason && <span className="text-[11px] text-[var(--ink-muted)] block truncate max-w-[150px]">{adj.reason}</span>}
                          </td>
                          <td className="px-4 py-3 hidden xl:table-cell">
                            <span className="text-xs text-[var(--ink-muted)]">{adj.reference || <span className="italic">—</span>}</span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => router.push(`/products/${adj.product_id}`)}
                              className="p-1.5 text-[var(--ink-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-[var(--radius-sm)] transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-[var(--border-subtle)] text-xs text-[var(--ink-muted)]">
                  {filteredAdjustments.length} ajustes
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <StockAdjustmentModal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setSelectedProductId(undefined) }}
        onSuccess={() => { setShowModal(false); setSelectedProductId(undefined); fetchData() }}
        preSelectedProductId={selectedProductId}
      />
    </div>
  )
}
