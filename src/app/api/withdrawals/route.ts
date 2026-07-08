import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getServerCompanyId } from '@/lib/supabase/company'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const body = await request.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = await getServerCompanyId()

  const { data: withdrawal, error } = await supabase.from('stock_withdrawals').insert({
    product_id: body.product_id,
    quantity: body.quantity,
    person_name: null,
    person_email: null,
    delivery_type: 'paid',
    observations: body.reason === 'otro'
      ? `[${body.reason}] ${body.observations || ''}`
      : `[${body.reason}] ${body.observations || ''}`,
    seller_id: null,
    reason: body.reason,
    supplier_id: body.supplier_id || null,
    withdrawal_date: new Date().toISOString(),
    company_id: companyId,
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

  return NextResponse.json(withdrawal)
}
