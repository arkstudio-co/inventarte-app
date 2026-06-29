'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, Download, Printer } from 'lucide-react'
import type { Remision, RemisionItem, Seller } from '@/types/database'

export default function RemisionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()

  const [remision, setRemision] = useState<(Remision & { sellers?: Seller | null; remision_items?: RemisionItem[] }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    fetchRemision()
  }, [params.id])

  const fetchRemision = async () => {
    const { data } = await supabase
      .from('remisiones')
      .select('*, remision_items(*), sellers(*)')
      .eq('id', params.id)
      .single()
    if (data) setRemision(data as any)
    setLoading(false)
  }

  const formatCurrency = (n: number) => '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const downloadPDF = async () => {
    setDownloading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      await import('jspdf-autotable')

      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 20

      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('DIBUJARTE EDITORES', margin, 25)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Nit: 123.456.789-0', margin, 31)
      doc.text('Tel: (1) 234 5678', margin, 35)
      doc.text('Email: info@dibujarte.com', margin, 39)
      doc.text('Bogotá D.C., Colombia', margin, 43)

      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('REMISIÓN', pageWidth - margin, 25, { align: 'right' })

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`N° ${remision?.remision_number || ''}`, pageWidth - margin, 32, { align: 'right' })

      doc.setFontSize(9)
      doc.text(`Fecha: ${remision ? formatDate(remision.created_at) : ''}`, pageWidth - margin, 38, { align: 'right' })

      doc.setDrawColor(200)
      doc.line(margin, 48, pageWidth - margin, 48)

      const sellerName = remision?.sellers?.name || remision?.person_name || ''
      const sellerEmail = remision?.sellers?.email || remision?.person_email || ''
      const sellerPhone = remision?.sellers?.phone || ''

      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('DATOS DEL COLABORADOR', margin, 56)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(`Nombre: ${sellerName}`, margin, 63)
      doc.text(`Email: ${sellerEmail || '—'}`, margin, 68)
      doc.text(`Teléfono: ${sellerPhone || '—'}`, margin, 73)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text('Tipo de entrega:', pageWidth - margin, 63, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      doc.text(
        remision?.delivery_type === 'paid' ? 'Producto pagado' : 'Producto por pagar',
        pageWidth - margin, 68, { align: 'right' }
      )

      const items = remision?.remision_items || []
      const tableData = items.map((item, index) => [
        (index + 1).toString(),
        item.product_name,
        item.quantity.toString(),
        formatCurrency(item.unit_price),
        formatCurrency(item.subtotal),
      ])

      ;(doc as any).autoTable({
        startY: 80,
        head: [['#', 'Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: [51, 51, 51],
          fontSize: 9,
          fontStyle: 'bold',
          halign: 'center',
        },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 35, halign: 'right' },
          4: { cellWidth: 35, halign: 'right' },
        },
        margin: { left: margin, right: margin },
      })

      const finalY = (doc as any).lastAutoTable.finalY + 5
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL:', pageWidth - margin - 70, finalY, { align: 'right' })
      doc.text(formatCurrency(remision?.total_amount || 0), pageWidth - margin, finalY, { align: 'right' })

      if (remision?.notes) {
        const notesY = finalY + 10
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('Observaciones:', margin, notesY)
        doc.setFont('helvetica', 'normal')
        doc.text(remision.notes, margin, notesY + 5)
      }

      const signatureY = Math.max(finalY + 20, 240)
      doc.setDrawColor(200)
      doc.line(margin + 20, signatureY, margin + 80, signatureY)
      doc.line(pageWidth - margin - 80, signatureY, pageWidth - margin - 20, signatureY)

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Firma del Colaborador', margin + 20, signatureY + 5, { align: 'center' })
      doc.text('Firma Dibujarte Editores', pageWidth - margin - 80, signatureY + 5, { align: 'center' })

      doc.setFontSize(7)
      doc.text('CC: ____________________', margin + 20, signatureY + 11, { align: 'center' })
      doc.text('CC: ____________________', pageWidth - margin - 80, signatureY + 11, { align: 'center' })

      doc.save(`Remision_${remision?.remision_number || 'unknown'}.pdf`)
    } catch (err) {
      console.error('Error generando PDF:', err)
    }
    setDownloading(false)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return <div className="animate-pulse text-sm text-[var(--ink-tertiary)]">Cargando...</div>
  }

  if (!remision) {
    return <div className="text-sm text-[var(--danger)]">Remisión no encontrada</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <button onClick={() => router.back()} className="p-2 text-[var(--ink-tertiary)] hover:text-[var(--ink)] hover:bg-[var(--surface-1)] rounded-[var(--radius-sm)] transition-colors cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer size={14} /> Imprimir
          </Button>
          <Button size="sm" onClick={downloadPDF} disabled={downloading}>
            <Download size={14} /> {downloading ? 'Generando...' : 'Descargar PDF'}
          </Button>
        </div>
      </div>

      <div className="bg-white text-black p-8 rounded-[var(--radius-md)] shadow-sm border border-[var(--border-default)] print:shadow-none print:border-none print:rounded-none" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>DIBUJARTE EDITORES</h1>
            <p className="text-xs mt-1" style={{ color: '#666' }}>Nit: 123.456.789-0</p>
            <p className="text-xs" style={{ color: '#666' }}>Tel: (1) 234 5678</p>
            <p className="text-xs" style={{ color: '#666' }}>Email: info@dibujarte.com</p>
            <p className="text-xs" style={{ color: '#666' }}>Bogotá D.C., Colombia</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold" style={{ color: '#1a1a1a' }}>REMISIÓN</h2>
            <p className="text-base font-mono mt-1" style={{ color: '#333' }}>N° {remision.remision_number}</p>
            <p className="text-xs mt-1" style={{ color: '#666' }}>Fecha: {formatDate(remision.created_at)}</p>
          </div>
        </div>

        <hr className="mb-4" style={{ borderColor: '#ccc' }} />

        <div className="flex justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold mb-1" style={{ color: '#1a1a1a' }}>DATOS DEL COLABORADOR</h3>
            <p className="text-xs" style={{ color: '#333' }}>Nombre: {remision.sellers?.name || remision.person_name}</p>
            <p className="text-xs" style={{ color: '#333' }}>Email: {remision.sellers?.email || remision.person_email || '—'}</p>
            <p className="text-xs" style={{ color: '#333' }}>Teléfono: {remision.sellers?.phone || '—'}</p>
          </div>
          <div className="text-right">
            <h3 className="text-sm font-bold mb-1" style={{ color: '#1a1a1a' }}>TIPO DE ENTREGA</h3>
            <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${
              remision.delivery_type === 'paid'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {remision.delivery_type === 'paid' ? 'PAGADO' : 'POR PAGAR'}
            </span>
          </div>
        </div>

        <table className="w-full text-xs border-collapse mb-4">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="text-center p-2 font-bold w-10">#</th>
              <th className="text-left p-2 font-bold">Producto</th>
              <th className="text-center p-2 font-bold w-16">Cant.</th>
              <th className="text-right p-2 font-bold w-28">Precio Unit.</th>
              <th className="text-right p-2 font-bold w-28">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {remision.remision_items?.map((item, idx) => (
              <tr key={item.id} className="border-b border-gray-200">
                <td className="text-center p-2">{idx + 1}</td>
                <td className="p-2">{item.product_name}</td>
                <td className="text-center p-2">{item.quantity}</td>
                <td className="text-right p-2">{formatCurrency(item.unit_price)}</td>
                <td className="text-right p-2 font-medium">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mb-6">
          <div className="w-56 flex justify-between items-center border-t-2 border-gray-800 pt-2">
            <span className="font-bold text-sm">TOTAL:</span>
            <span className="font-bold text-sm">{formatCurrency(remision.total_amount)}</span>
          </div>
        </div>

        {remision.notes && (
          <div className="mb-6">
            <h3 className="text-sm font-bold mb-1" style={{ color: '#1a1a1a' }}>Observaciones</h3>
            <p className="text-xs" style={{ color: '#555' }}>{remision.notes}</p>
          </div>
        )}

        <div className="flex justify-between mt-16 pt-4" style={{ borderTop: '1px solid #ccc' }}>
          <div className="text-center w-56">
            <div className="border-t border-gray-400 pt-1 mb-1"></div>
            <p className="text-xs font-medium">Firma del Colaborador</p>
            <p className="text-xs" style={{ color: '#666' }}>CC: ____________________</p>
          </div>
          <div className="text-center w-56">
            <div className="border-t border-gray-400 pt-1 mb-1"></div>
            <p className="text-xs font-medium">Firma Dibujarte Editores</p>
            <p className="text-xs" style={{ color: '#666' }}>CC: ____________________</p>
          </div>
        </div>
      </div>
    </div>
  )
}
