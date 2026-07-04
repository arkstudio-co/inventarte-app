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
  const { seller_id, person_name, person_email, delivery_type, notes, items, payment_method, bank_account, card_last_four, payment_observations } = body

  if (!seller_id || !person_name || !items || items.length === 0) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
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

  const itemsWithSubtotals = items.map((item: any) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.quantity * item.unit_price,
  }))

  const totalAmount = itemsWithSubtotals.reduce((s: number, i: any) => s + i.subtotal, 0)

  const { data: remision, error: remError } = await supabase
    .from('remisiones')
    .insert({
      remision_number: remisionNumber,
      seller_id,
      person_name,
      person_email: person_email || null,
      delivery_type,
      total_amount: totalAmount,
      notes: notes || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (remError) return NextResponse.json({ error: remError.message }, { status: 500 })

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

  for (const item of items) {
    const { error: stockError } = await supabase.rpc('decrement_stock', {
      p_product_id: item.product_id,
      p_quantity: item.quantity,
    })
    if (stockError) {
      return NextResponse.json({ error: `Error descontando stock de ${item.product_name}: ${stockError.message}` }, { status: 500 })
    }
  }

  // Create payment record if payment_method is provided
  if (payment_method && delivery_type === 'paid') {
    const { error: paymentError } = await supabase.from('payments').insert({
      seller_id,
      amount: totalAmount,
      payment_method,
      bank_account: payment_method === 'transfer' ? (bank_account || null) : null,
      card_last_four: payment_method === 'transfer' ? (card_last_four || null) : null,
      observations: payment_observations || null,
    })
    if (paymentError) {
      console.error('Error creating payment:', paymentError)
    }
  }

  const { data: fullRemision } = await supabase
    .from('remisiones')
    .select('*, remision_items(*), sellers(*)')
    .eq('id', remision.id)
    .single()

  if (fullRemision && person_email && process.env.RESEND_API_KEY) {
    sendRemisionEmail({ to: person_email, remision: fullRemision }).catch(() => {})
  }

  return NextResponse.json(fullRemision, { status: 201 })
}
