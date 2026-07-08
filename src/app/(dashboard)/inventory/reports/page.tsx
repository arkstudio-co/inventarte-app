'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { DateFilter, computeDateRange } from '@/components/ui/DateFilter'
import type { DateFilterState } from '@/components/ui/DateFilter'
import { BarChart } from '@/components/ui/BarChart'
import { DonutChart } from '@/components/ui/DonutChart'

import {
  Download,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  CalendarDays,
  Table,
  PieChart,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react'
import jsPDF from 'jspdf'
import { __createTable, __drawTable } from 'jspdf-autotable'

export default function InventoryReportsPage() {
  const supabase = createClient()

  const [products, setProducts] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [entriesList, setEntriesList] = useState<any[]>([])
  const [withdrawalsList, setWithdrawalsList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [reportTab, setReportTab] = useState<'overview' | 'stock' | 'movements'>('overview')

  const [filter, setFilter] = useState<DateFilterState>({
    mode: 'month',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    customStart: '',
    customEnd: '',
  })
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const fetchData = async () => {
    setIsLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setIsLoading(false); setError('Debes iniciar sesión'); return }

    const [productsRes, entriesRes, withdrawalsRes, suppliersRes] = await Promise.all([
      supabase.from('products').select('*, suppliers(name)').order('name'),
      supabase.from('stock_entries').select('*, products(name, sku, suppliers(name))').order('created_at', { ascending: false }),
      supabase.from('stock_withdrawals').select('*, products(name, sku)').order('withdrawal_date', { ascending: false }),
      supabase.from('suppliers').select('*').order('name'),
    ])

    if (productsRes.error) { setError(productsRes.error.message); setIsLoading(false); return }
    setProducts(productsRes.data || [])
    setEntriesList(entriesRes.data || [])
    setWithdrawalsList(withdrawalsRes.data || [])
    if (suppliersRes.data) setSuppliers(suppliersRes.data)
    setIsLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const { startDate, endDate } = computeDateRange(filter)

  const periodEntries = useMemo(() => {
    return entriesList.filter((e) => {
      if (startDate && new Date(e.created_at) < startDate) return false
      if (endDate && new Date(e.created_at) >= endDate) return false
      return true
    })
  }, [entriesList, startDate, endDate])

  const periodWithdrawals = useMemo(() => {
    return withdrawalsList.filter((w) => {
      if (startDate && new Date(w.withdrawal_date) < startDate) return false
      if (endDate && new Date(w.withdrawal_date) >= endDate) return false
      return true
    })
  }, [withdrawalsList, startDate, endDate])

  const overviewStats = useMemo(() => {
    const totalVal = products.reduce((s: number, p: any) => s + p.stock * p.cost, 0)
    const totalSell = products.reduce((s: number, p: any) => s + p.stock * p.price, 0)
    const totalEntries = periodEntries.reduce((s: number, e: any) => s + e.quantity, 0)
    const totalWithdrawals = periodWithdrawals.reduce((s: number, w: any) => s + w.quantity, 0)
    const lowStock = products.filter((p: any) => p.stock <= p.min_stock && p.stock > 0).length
    const outStock = products.filter((p: any) => p.stock === 0).length
    const entryCost = periodEntries.reduce((s: number, e: any) => s + (e.quantity * (products.find((p: any) => p.id === e.product_id)?.cost || 0)), 0)
    const withdrawalRevenue = periodWithdrawals.reduce((s: number, w: any) => s + (w.quantity * (products.find((p: any) => p.id === w.product_id)?.price || 0)), 0)
    return { totalVal, totalSell, totalEntries, totalWithdrawals, lowStock, outStock, entryCost, withdrawalRevenue }
  }, [products, periodEntries, periodWithdrawals])

  const stockBySupplier = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of products as any[]) {
      const name = p.suppliers?.name || 'Sin proveedor'
      map.set(name, (map.get(name) || 0) + p.stock * p.cost)
    }
    return Array.from(map.entries()).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
  }, [products])

  const stockStatusChart = useMemo(() => {
    const available = products.filter((p: any) => p.stock > p.min_stock).length
    const low = products.filter((p: any) => p.stock <= p.min_stock && p.stock > 0).length
    const out = products.filter((p: any) => p.stock === 0).length
    return [
      { label: 'Disponible', value: available, color: 'var(--success)' },
      { label: 'Stock bajo', value: low, color: 'var(--warning)' },
      { label: 'Sin stock', value: out, color: 'var(--danger)' },
    ]
  }, [products])

  const topProductsByValue = useMemo(() => {
    return (products as any[])
      .map((p: any) => ({ label: p.name, value: p.stock * p.cost }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
  }, [products])

  const topSuppliersByValue = useMemo(() => {
    const map = new Map<string, { name: string; value: number; products: number }>()
    for (const p of products as any[]) {
      const name = p.suppliers?.name || 'Sin proveedor'
      const existing = map.get(name) || { name, value: 0, products: 0 }
      existing.value += p.stock * p.cost
      existing.products += 1
      map.set(name, existing)
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value)
  }, [products])

  const generateStockCsv = () => {
    const headers = ['Producto', 'SKU', 'Stock', 'Stock Mínimo', 'Costo', 'Precio', 'Valor Inventario', 'Proveedor', 'Estado']
    const rows = products.map((p: any) => [
      p.name, p.sku, p.stock, p.min_stock, p.cost, p.price, p.stock * p.cost,
      p.suppliers?.name || '', p.stock === 0 ? 'Sin stock' : p.stock <= p.min_stock ? 'Stock bajo' : 'Disponible',
    ])
    const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'inventario_completo.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const generateMovementCsv = () => {
    const headers = ['Fecha', 'Producto', 'SKU', 'Tipo', 'Cantidad', 'Referencia', 'Obs.']
    const rows: string[][] = []
    for (const e of periodEntries) {
      const p = products.find((pr: any) => pr.id === e.product_id)
      rows.push([new Date(e.created_at).toLocaleString('es-CO'), p?.name || '', p?.sku || '', 'Entrada', e.quantity, p?.suppliers?.name || 'Proveedor', e.observations || ''])
    }
    for (const w of periodWithdrawals) {
      const p = products.find((pr: any) => pr.id === w.product_id)
      rows.push([new Date(w.withdrawal_date).toLocaleString('es-CO'), p?.name || '', p?.sku || '', 'Salida', w.quantity, w.person_name, w.observations || ''])
    }
    rows.sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'movimientos.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const generatePdf = async () => {
    setGeneratingPdf(true)
    try {
      const doc = new jsPDF()
      const pw = doc.internal.pageSize.getWidth()
      const M = 14
      const C = {
        primary: [26, 95, 122] as [number, number, number],
        gold: [212, 160, 74] as [number, number, number],
        grayBg: [245, 246, 248] as [number, number, number],
        ink: [30, 30, 46] as [number, number, number],
        inkSec: [90, 91, 110] as [number, number, number],
        success: [46, 125, 92] as [number, number, number],
        danger: [196, 64, 64] as [number, number, number],
        warn: [212, 148, 58] as [number, number, number],
        line: [200, 200, 200] as [number, number, number],
        footer: [180, 180, 195] as [number, number, number],
      }

      // ── Cover page ──
      const now = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
      const periodStr = filter.mode === 'all'
        ? 'Todo el historial'
        : `${startDate?.toLocaleDateString('es-CO') || '—'} — ${endDate?.toLocaleDateString('es-CO') || '—'}`
      const activeProducts = products.filter((p: any) => p.stock > 0).length

      doc.setFillColor(...C.primary)
      doc.rect(M, 30, pw - M * 2, 2.5, 'F')
      doc.setFillColor(...C.gold)
      doc.rect(M, 32.5, 40, 0.8, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.text('DIBUJARTE EDITORES', M, 48)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text('Nit: 123.456.789-0', M, 54)
      doc.text('Tel: (1) 234 5678', M, 58)
      doc.text('Email: info@dibujarte.com', M, 62)
      doc.text('Bogotá D.C., Colombia', M, 66)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(24)
      doc.setTextColor(...C.primary)
      doc.text('REPORTE DE INVENTARIO', pw / 2, 54, { align: 'center' })
      doc.setTextColor(0)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...C.inkSec)
      doc.text(`Generado el ${now}`, pw / 2, 64, { align: 'center' })
      doc.text(`Período: ${periodStr}`, pw / 2, 72, { align: 'center' })
      doc.text(`Total productos: ${products.length}`, pw / 2, 80, { align: 'center' })

      doc.setDrawColor(...C.primary)
      doc.setLineWidth(0.5)
      doc.line(M, 90, pw - M, 90)

      // ── Summary ──
      let y = 102
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...C.primary)
      doc.text('Resumen General', M, y)
      y += 8
      doc.setTextColor(0)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)

      const summaryBoxes = [
        { label: 'Valor Inventario', value: formatCurrency(overviewStats.totalVal), color: C.primary },
        { label: 'Valor Venta', value: formatCurrency(overviewStats.totalSell), color: C.ink },
        { label: 'Entradas', value: `${overviewStats.totalEntries} un.`, color: C.success },
        { label: 'Salidas', value: `${overviewStats.totalWithdrawals} un.`, color: C.danger },
      ]
      const boxW = (pw - M * 2 - 8) / 4
      summaryBoxes.forEach((box, i) => {
        const bx = M + i * (boxW + 2.5)
        doc.setFillColor(...C.grayBg)
        doc.roundedRect(bx, y - 5, boxW, 16, 1.5, 1.5, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6)
        doc.setTextColor(...C.inkSec)
        doc.text(box.label.toUpperCase(), bx + boxW / 2, y + 0.5, { align: 'center' })
        doc.setFontSize(10)
        doc.setTextColor(...box.color)
        doc.text(box.value, bx + boxW / 2, y + 9, { align: 'center' })
        doc.setTextColor(0)
      })
      y += 22

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...C.inkSec)
      doc.text(`Con stock: ${activeProducts}/${products.length}     Stock bajo: ${overviewStats.lowStock}     Sin stock: ${overviewStats.outStock}`, M, y + 2)
      doc.setTextColor(0)
      y += 10

      const [entryRev, withdrRev] = [overviewStats.entryCost, overviewStats.withdrawalRevenue]
      doc.setFontSize(8)
      doc.setTextColor(...C.inkSec)
      doc.text(`Costo entradas: ${formatCurrency(entryRev)}     Ingreso salidas: ${formatCurrency(withdrRev)}     Margen: ${formatCurrency(overviewStats.totalSell - overviewStats.totalVal)}`, M, y + 2)
      doc.setTextColor(0)
      y += 12

      // ── Products table ──
      doc.setDrawColor(...C.line)
      doc.setLineWidth(0.3)
      doc.line(M, y, pw - M, y)
      y += 8

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(...C.primary)
      doc.text('Inventario Detallado', M, y)
      y += 8
      doc.setTextColor(0)

      const tableHeaders = [['Producto', 'SKU', 'Stock', 'Min.', 'Costo', 'Precio', 'Valor', 'Proveedor']]
      const tableRows = products.map((p: any) => [
        p.name, p.sku, p.stock, p.min_stock, formatCurrency(p.cost), formatCurrency(p.price),
        formatCurrency(p.stock * p.cost), p.suppliers?.name || '',
      ])

      const table = __createTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: y,
        theme: 'grid',
        headStyles: {
          fillColor: C.primary,
          textColor: [255, 255, 255] as [number, number, number],
          fontSize: 7,
          fontStyle: 'bold',
          halign: 'center',
        },
        bodyStyles: { fontSize: 7 },
        alternateRowStyles: { fillColor: C.grayBg },
        styles: { cellPadding: 1.5 },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 22 },
          2: { cellWidth: 13, halign: 'center' },
          3: { cellWidth: 10, halign: 'center' },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 22, halign: 'right' },
          6: { cellWidth: 24, halign: 'right' },
          7: { cellWidth: 30 },
        },
        margin: { left: M, right: M },
        pageBreak: 'auto',
      })
      __drawTable(doc, table)
      const finalY = table.finalY

      // ── Low stock section ──
      const lowStockProducts = products.filter((p: any) => p.stock <= p.min_stock && p.stock > 0)
      const outStockProducts = products.filter((p: any) => p.stock === 0)
      let ny = (finalY || y) + 8

      for (const section of [
        { label: 'Stock Bajo', icon: '●', color: C.warn, items: lowStockProducts, fmt: (p: any) => `${p.name} (${p.sku}) — Stock: ${p.stock} / Mín: ${p.min_stock}` },
        { label: 'Sin Stock', icon: '●', color: C.danger, items: outStockProducts, fmt: (p: any) => `${p.name} (${p.sku})` },
      ]) {
        if (ny + 20 > 275) { doc.addPage(); ny = 20 }
        doc.setDrawColor(...C.line)
        doc.setLineWidth(0.3)
        doc.line(M, ny, pw - M, ny)
        ny += 8
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(...section.color)
        doc.text(section.label, M, ny)
        ny += 8
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(...C.inkSec)
        doc.text(`${section.items.length} producto(s)`, M, ny)
        ny += 6
        for (const item of section.items) {
          if (ny > 275) { doc.addPage(); ny = 20 }
          doc.setTextColor(...section.color)
          doc.text(section.icon, M, ny)
          doc.setTextColor(...C.ink)
          doc.text(section.fmt(item), M + 4, ny)
          ny += 5
        }
        ny += 4
      }

      // ── Footer on every page ──
      const totalPages = (doc.internal as any).getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setDrawColor(...C.primary)
        doc.setLineWidth(0.3)
        doc.line(M, 290, pw - M, 290)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)
        doc.setTextColor(...C.footer)
        doc.text(`Generado por Inventarte — Dibujarte Editores · Página ${i} de ${totalPages}`, pw / 2, 294, { align: 'center' })
      }

      doc.setTextColor(0)
      doc.save('reporte_inventario.pdf')
    } catch (err) {
      console.error('Error generating PDF:', err)
      setError('Error al generar el PDF')
    }
    setGeneratingPdf(false)
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between"><h1 className="text-xl font-semibold text-[var(--ink)]">Reportes</h1></div>
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
        <h1 className="text-xl font-semibold text-[var(--ink)]">Reportes</h1>
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
          <h1 className="text-xl font-semibold text-[var(--ink)]">Reportes</h1>
          <p className="text-sm text-[var(--ink-tertiary)] mt-0.5">Análisis y exportación de datos de inventario</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={generateStockCsv}>
            <FileSpreadsheet size={14} /> Exportar Stock (CSV)
          </Button>
          <Button variant="secondary" size="sm" onClick={generateMovementCsv}>
            <FileSpreadsheet size={14} /> Exportar Mov. (CSV)
          </Button>
          <Button size="sm" onClick={generatePdf} disabled={generatingPdf}>
            <Download size={14} /> {generatingPdf ? 'Generando...' : 'PDF Completo'}
          </Button>
        </div>
      </div>

      {/* Date Filter */}
      <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-[var(--ink-tertiary)]" />
          <DateFilter value={filter} onChange={setFilter} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] w-fit">
        <button
          onClick={() => setReportTab('overview')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-[var(--radius-sm)] transition-colors cursor-pointer font-medium ${
            reportTab === 'overview' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]'
          }`}
        >
          <PieChart size={14} /> General
        </button>
        <button
          onClick={() => setReportTab('stock')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-[var(--radius-sm)] transition-colors cursor-pointer font-medium ${
            reportTab === 'stock' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]'
          }`}
        >
          <Table size={14} /> Inventario
        </button>
        <button
          onClick={() => setReportTab('movements')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-[var(--radius-sm)] transition-colors cursor-pointer font-medium ${
            reportTab === 'movements' ? 'bg-[var(--accent)] text-white shadow-sm' : 'text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]'
          }`}
        >
          <BarChart3 size={14} /> Movimientos
        </button>
      </div>

      {reportTab === 'overview' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
              <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
                <DollarSign size={14} />
                <span className="text-xs font-medium uppercase tracking-wide">Valor Inventario</span>
              </div>
              <p className="text-lg font-semibold text-[var(--ink)]">{formatCurrency(overviewStats.totalVal)}</p>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
              <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
                <TrendingUp size={14} />
                <span className="text-xs font-medium uppercase tracking-wide">Entradas Período</span>
              </div>
              <p className="text-lg font-semibold text-[var(--success)]">+{overviewStats.totalEntries}</p>
              <p className="text-[11px] text-[var(--ink-muted)]">{formatCurrency(overviewStats.entryCost)} en costo</p>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
              <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
                <TrendingDown size={14} />
                <span className="text-xs font-medium uppercase tracking-wide">Salidas Período</span>
              </div>
              <p className="text-lg font-semibold text-[var(--danger)]">-{overviewStats.totalWithdrawals}</p>
              <p className="text-[11px] text-[var(--ink-muted)]">{formatCurrency(overviewStats.withdrawalRevenue)} en venta</p>
            </div>
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
              <div className="flex items-center gap-2 text-[var(--ink-tertiary)] mb-1">
                <Package size={14} />
                <span className="text-xs font-medium uppercase tracking-wide">Alertas</span>
              </div>
              <p className="text-lg font-semibold">
                <span className="text-[var(--warning)]">{overviewStats.lowStock}</span>
                <span className="text-[var(--ink-tertiary)] mx-1">/</span>
                <span className="text-[var(--danger)]">{overviewStats.outStock}</span>
              </p>
              <p className="text-[11px] text-[var(--ink-muted)]">bajo / sin stock</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
              <h3 className="text-sm font-semibold text-[var(--ink)] mb-4">Stock por Proveedor</h3>
              {stockBySupplier.length > 0 ? <BarChart data={stockBySupplier} formatValue={(v) => formatCurrency(v)} /> : <p className="text-sm text-[var(--ink-muted)] text-center py-8">Sin datos</p>}
            </div>
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
              <h3 className="text-sm font-semibold text-[var(--ink)] mb-4">Estado de Stock</h3>
              <DonutChart segments={stockStatusChart} formatValue={(v) => `${v} prod.`} />
            </div>
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
              <h3 className="text-sm font-semibold text-[var(--ink)] mb-4">Top Productos por Valor</h3>
              {topProductsByValue.length > 0 ? <BarChart data={topProductsByValue} formatValue={(v) => formatCurrency(v)} /> : <p className="text-sm text-[var(--ink-muted)] text-center py-8">Sin datos</p>}
            </div>
            <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
              <h3 className="text-sm font-semibold text-[var(--ink)] mb-4">Proveedores</h3>
              {topSuppliersByValue.length > 0 ? (
                <div className="space-y-2">
                  {topSuppliersByValue.slice(0, 8).map((s) => (
                    <div key={s.name} className="flex items-center justify-between">
                      <span className="text-sm text-[var(--ink-secondary)]">{s.name}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-[var(--ink)]">{formatCurrency(s.value)}</span>
                        <span className="text-[11px] text-[var(--ink-muted)] ml-1.5">({s.products} prod.)</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-[var(--ink-muted)] text-center py-8">Sin datos</p>}
            </div>
          </div>
        </>
      )}

      {reportTab === 'stock' && (
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
            <h3 className="text-sm font-semibold text-[var(--ink)]">Inventario Completo ({products.length} productos)</h3>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--surface-2)]/95 backdrop-blur">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Producto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">SKU</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider hidden sm:table-cell">Min.</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider hidden md:table-cell">Costo</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider hidden md:table-cell">Precio</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider hidden lg:table-cell">Valor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider hidden lg:table-cell">Proveedor</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {products.map((p: any) => (
                  <tr key={p.id} className="hover:bg-[var(--surface-2)]/30 transition-colors">
                    <td className="px-4 py-2.5 text-sm font-medium text-[var(--ink)]">{p.name}</td>
                    <td className="px-4 py-2.5 text-xs text-[var(--ink-muted)] font-mono">{p.sku}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`text-sm font-bold font-mono ${p.stock === 0 ? 'text-[var(--danger)]' : p.stock <= p.min_stock ? 'text-[var(--warning)]' : 'text-[var(--ink)]'}`}>{p.stock}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-sm text-[var(--ink-tertiary)] font-mono hidden sm:table-cell">{p.min_stock}</td>
                    <td className="px-4 py-2.5 text-right text-sm text-[var(--danger)] font-medium hidden md:table-cell">{formatCurrency(p.cost)}</td>
                    <td className="px-4 py-2.5 text-right text-sm text-[var(--success)] font-medium hidden md:table-cell">{formatCurrency(p.price)}</td>
                    <td className="px-4 py-2.5 text-right text-sm font-semibold text-[var(--ink)] hidden lg:table-cell">{formatCurrency(p.stock * p.cost)}</td>
                    <td className="px-4 py-2.5 text-sm text-[var(--ink-secondary)] hidden lg:table-cell">{p.suppliers?.name || <span className="text-[var(--ink-muted)]">—</span>}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                        p.stock === 0 ? 'bg-[var(--danger)]/10 text-[var(--danger)]' : p.stock <= p.min_stock ? 'bg-[var(--warning)]/10 text-[var(--warning)]' : 'bg-[var(--success)]/10 text-[var(--success)]'
                      }`}>
                        {p.stock === 0 ? 'Sin stock' : p.stock <= p.min_stock ? 'Bajo' : 'OK'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportTab === 'movements' && (
        <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
            <h3 className="text-sm font-semibold text-[var(--ink)]">
              Movimientos del Período ({periodEntries.length + periodWithdrawals.length} registros)
            </h3>
          </div>
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--surface-2)]/95 backdrop-blur">
                <tr className="border-b border-[var(--border-subtle)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Producto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Tipo</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider">Cantidad</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider hidden md:table-cell">Referencia</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--ink-tertiary)] uppercase tracking-wider hidden lg:table-cell">Obs.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {[...periodEntries.map((e: any) => ({ ...e, _type: 'entry' as const })), ...periodWithdrawals.map((w: any) => ({ ...w, _type: 'withdrawal' as const }))]
                  .sort((a: any, b: any) => new Date(b.created_at || b.withdrawal_date).getTime() - new Date(a.created_at || a.withdrawal_date).getTime())
                  .map((m: any) => {
                    const p = products.find((pr: any) => pr.id === m.product_id)
                    return (
                      <tr key={m.id} className={`hover:bg-[var(--surface-2)]/30 transition-colors ${m._type === 'entry' ? 'hover:bg-[var(--success)]/5' : 'hover:bg-[var(--danger)]/5'}`}>
                        <td className="px-4 py-2.5 text-xs text-[var(--ink-secondary)] font-mono whitespace-nowrap">
                          {new Date(m.created_at || m.withdrawal_date).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-sm font-medium text-[var(--ink)]">{p?.name || '(eliminado)'}</span>
                          <span className="text-[11px] text-[var(--ink-muted)] font-mono ml-2">{p?.sku}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            m._type === 'entry' ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--danger)]/10 text-[var(--danger)]'
                          }`}>
                            {m._type === 'entry' ? 'Entrada' : 'Salida'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`text-sm font-semibold ${m._type === 'entry' ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
                            {m._type === 'entry' ? '+' : '-'}{m.quantity}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-[var(--ink-secondary)] hidden md:table-cell">
                          {m._type === 'entry' ? p?.suppliers?.name || 'Proveedor' : m.person_name}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-[var(--ink-muted)] hidden lg:table-cell max-w-[200px] truncate">
                          {m.observations || <span className="italic">—</span>}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
