import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { sendRemisionEmail } from '@/lib/email/resend'
import { getServerCompanyId } from '@/lib/supabase/company'

function friendlyStockError(raw: string | null | undefined): string {
  if (!raw) return 'No hay stock suficiente'
  const m = raw.match(/^Stock insuficiente: (\d+) < (\d+) para "(.+)"$/)
  if (m) {
    const [, available, , name] = m
    return Number(available) === 0
      ? `No hay stock disponible de ${name}`
      : `Stock insuficiente de ${name}: solo hay ${available} disponibles`
  }
  return raw
}

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('remisiones')
    .select('*, sellers(*)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { seller_id, person_name, person_email, delivery_type, type, notes, items, payment_method, bank_account, card_last_four, payment_observations } = body
  const remisionType = type || 'sale'

  if (!seller_id || !person_name) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
  }

  if (remisionType === 'sale' && (!items || items.length === 0)) {
    return NextResponse.json({ error: 'Una venta requiere al menos un producto' }, { status: 400 })
  }

  // Generate remision number in application code
  const { data: last } = await supabase
    .from('remisiones')
    .select('remision_number')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let next = 1
  if (last?.remision_number) {
    const num = parseInt(last.remision_number.replace('REM-', ''), 10)
    if (!isNaN(num)) next = num + 1
  }
  const remisionNumber = `REM-${String(next).padStart(4, '0')}`

  const itemsWithSubtotals = (items || []).map((item: any) => {
    const qty = remisionType === 'return' ? -Math.abs(item.quantity) : item.quantity
    const subtotal = qty * item.unit_price
    return {
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: qty,
      unit_price: item.unit_price,
      unit_cost: item.unit_cost ?? null,
      subtotal,
    }
  })

  const totalAmount = remisionType === 'payment'
    ? (body.total_amount || 0)
    : itemsWithSubtotals.reduce((s: number, i: any) => s + i.subtotal, 0)

  let finalNotes = notes || null
  if (payment_method) {
    const parts = [`Pago: ${payment_method === 'cash' ? 'Efectivo' : 'Transferencia'}`]
    if (payment_method === 'transfer') {
      if (bank_account) parts.push(`Cuenta: ${bank_account}`)
      if (card_last_four) parts.push(`Últ. 4 dígitos: ${card_last_four}`)
    }
    if (payment_observations) parts.push(`Obs: ${payment_observations}`)
    finalNotes = finalNotes ? `${finalNotes}\n${parts.join(' | ')}` : parts.join(' | ')
  }

  // No saldo a favor: abonos y devoluciones limitados por la deuda pendiente
  if (remisionType === 'payment' || remisionType === 'return') {
    const balance = await getSellerOutstandingBalance(supabase, seller_id)
    if (remisionType === 'payment') {
      if (totalAmount > balance + 0.001) {
        if (balance <= 0.001) {
          return NextResponse.json({ error: 'El vendedor no tiene deuda pendiente' }, { status: 400 })
        }
        return NextResponse.json({
          error: `No puedes abonar ${fmtMoney(totalAmount)}: el vendedor solo debe ${fmtMoney(balance)}`,
        }, { status: 400 })
      }
    } else if (remisionType === 'return') {
      const returnValue = Math.abs(totalAmount)
      if (returnValue > balance + 0.001) {
        return NextResponse.json({
          error: `La devolución (${fmtMoney(returnValue)}) excede la deuda pendiente del vendedor (${fmtMoney(Math.max(balance, 0))})`,
        }, { status: 400 })
      }
    }
  }

  const companyId = await getServerCompanyId()

  const { data: remision, error: remError } = await supabase
    .from('remisiones')
    .insert({
      remision_number: remisionNumber,
      seller_id,
      person_name,
      person_email: person_email || null,
      type: remisionType,
      delivery_type: delivery_type || 'paid',
      total_amount: totalAmount,
      notes: finalNotes,
      company_id: companyId,
      created_by: user.id,
    })
    .select()
    .single()

  if (remError) return NextResponse.json({ error: remError.message }, { status: 500 })

  // Insert items (skip for payments)
  if (itemsWithSubtotals.length > 0) {
    const { error: itemsError } = await supabase
      .from('remision_items')
      .insert(
        itemsWithSubtotals.map((item: any) => ({
          ...item,
          remision_id: remision.id,
        }))
      )

    if (itemsError) {
      await supabase.from('remisiones').delete().eq('id', remision.id)
      return NextResponse.json({ error: itemsError.message }, { status: 500 })
    }
  }

  // Stock operations: decrement for sales, increment for returns
  if (remisionType === 'sale') {
    for (const item of items) {
      const { data: stockResult, error: stockError } = await supabase.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      })
      const sr = stockResult as any
      if (stockError || sr?.error) {
        await supabase.from('remision_items').delete().eq('remision_id', remision.id)
        await supabase.from('remisiones').delete().eq('id', remision.id)
        return NextResponse.json({ error: friendlyStockError(sr?.error || `Error descontando stock de ${item.product_name}: ${stockError?.message}`) }, { status: 500 })
      }
    }
  } else if (remisionType === 'return' && items) {
    for (const item of items) {
      const available = await getReturnableQuantity(supabase, seller_id, item.product_id)
      if (item.quantity > available) {
        await supabase.from('remision_items').delete().eq('remision_id', remision.id)
        await supabase.from('remisiones').delete().eq('id', remision.id)
        return NextResponse.json({
          error: `No puedes devolver ${item.quantity} de ${item.product_name || 'este producto'}: el vendedor solo ha recibido ${available}`,
        }, { status: 400 })
      }
    }
    for (const item of items) {
      const { data: stockResult, error: stockError } = await supabase.rpc('increment_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      })
      const sr = stockResult as any
      if (stockError || sr?.error) {
        console.error(`Error reintegrando stock de ${item.product_name}:`, sr?.error || stockError)
      }
    }
  }

  const { data: fullRemision } = await supabase
    .from('remisiones')
    .select('*, remision_items(*), sellers(*)')
    .eq('id', remision.id)
    .single()

  if (fullRemision && person_email && process.env.RESEND_API_KEY) {
    sendRemisionEmail({ to: person_email, remision: fullRemision }).catch((err) =>
      console.error('Error sending remision email:', err)
    )
  }

  return NextResponse.json(fullRemision, { status: 201 })
}

async function getReturnableQuantity(
  supabase: any,
  sellerId: string,
  productId: string
): Promise<number> {
  const { data: remisiones } = await supabase
    .from('remisiones')
    .select('type, remision_items(product_id, quantity)')
    .eq('seller_id', sellerId)

  let delivered = 0
  let returned = 0
  for (const r of remisiones || []) {
    for (const item of r.remision_items || []) {
      if (item.product_id !== productId) continue
      if (r.type === 'sale') delivered += item.quantity
      else if (r.type === 'return') returned += Math.abs(item.quantity)
    }
  }

  const { data: legacyReturns } = await supabase
    .from('returns')
    .select('quantity')
    .eq('seller_id', sellerId)
    .eq('product_id', productId)
  for (const lr of legacyReturns || []) returned += lr.quantity

  return delivered - returned
}

async function getSellerOutstandingBalance(supabase: any, sellerId: string): Promise<number> {
  const { data: remisiones } = await supabase
    .from('remisiones')
    .select('type, delivery_type, total_amount')
    .eq('seller_id', sellerId)

  let pending = 0
  let returned = 0
  let paid = 0
  for (const r of remisiones || []) {
    if (r.type === 'sale' && r.delivery_type === 'pending') pending += r.total_amount || 0
    else if (r.type === 'return') returned += Math.abs(r.total_amount || 0)
    else if (r.type === 'payment') paid += r.total_amount || 0
  }

  const [{ data: legacyReturns }, { data: legacyPayments }] = await Promise.all([
    supabase.from('returns').select('quantity, products(price)').eq('seller_id', sellerId),
    supabase.from('payments').select('amount').eq('seller_id', sellerId),
  ])
  for (const ret of legacyReturns || []) returned += (ret.quantity || 0) * (ret.products?.price || 0)
  for (const p of legacyPayments || []) paid += p.amount || 0

  return pending - returned - paid
}

function fmtMoney(n: number) {
  return '$' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
