import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { sendWithdrawalEmail } from '@/lib/email/resend'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const body = await request.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: withdrawal, error } = await supabase.from('stock_withdrawals').insert({
    product_id: body.product_id,
    quantity: body.quantity,
    person_name: body.person_name,
    person_email: body.person_email,
    delivery_type: body.delivery_type,
    pending_amount: body.delivery_type === 'pending' ? body.pending_amount : null,
    observations: body.delivery_type === 'pending' ? body.observations : null,
    seller_id: body.seller_id || null,
    withdrawal_date: new Date().toISOString(),
    created_by: user.id,
  }).select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { error: stockError } = await supabase.rpc('decrement_stock', {
    p_product_id: body.product_id,
    p_quantity: body.quantity,
  })

  if (stockError) {
    await supabase.from('stock_withdrawals').delete().eq('id', withdrawal[0].id)
    return NextResponse.json({ error: stockError.message }, { status: 500 })
  }

  const { data: product } = await supabase.from('products').select('name').eq('id', body.product_id).single()

  if (product && process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your_resend_api_key_here') {
    sendWithdrawalEmail({
      to: body.person_email,
      productName: product.name,
      quantity: body.quantity,
      pendingAmount: body.delivery_type === 'pending' ? body.pending_amount : null,
      observations: body.delivery_type === 'pending' ? body.observations : null,
    }).catch(() => {})
  }

  return NextResponse.json(withdrawal)
}
