import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { sendRemisionEmail } from '@/lib/email/resend'

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
      const { error: stockError } = await supabase.rpc('decrement_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      })
      if (stockError) {
        return NextResponse.json({ error: `Error descontando stock de ${item.product_name}: ${stockError.message}` }, { status: 500 })
      }
    }
  } else if (remisionType === 'return' && items) {
    for (const item of items) {
      const { error: stockError } = await supabase.rpc('increment_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      })
      if (stockError) {
        console.error(`Error reintegrando stock de ${item.product_name}:`, stockError)
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
