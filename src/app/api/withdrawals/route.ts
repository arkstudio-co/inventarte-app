import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getServerCompanyId } from '@/lib/supabase/company'

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const body = await request.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = await getServerCompanyId()

  const obs = body.reason === 'otro'
    ? `[${body.reason}] ${body.observations || ''}`
    : `[${body.reason}] ${body.observations || ''}`

  const rows = body.items.map((item: { product_id: string; quantity: number }) => ({
    product_id: item.product_id,
    quantity: item.quantity,
    person_name: null,
    person_email: null,
    delivery_type: 'paid',
    observations: obs,
    seller_id: null,
    reason: body.reason,
    supplier_id: body.supplier_id || null,
    withdrawal_date: new Date().toISOString(),
    company_id: companyId,
    created_by: user.id,
  }))

  const { data: withdrawals, error } = await supabase.from('stock_withdrawals').insert(rows).select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  for (const row of rows) {
    const { error: stockError } = await supabase.rpc('decrement_stock', {
      p_product_id: row.product_id,
      p_quantity: row.quantity,
    })
    if (stockError) {
      await supabase.from('stock_withdrawals').delete().in('id', withdrawals.map((w: any) => w.id))
      return NextResponse.json({ error: stockError.message }, { status: 500 })
    }
  }

  return NextResponse.json(withdrawals)
}
