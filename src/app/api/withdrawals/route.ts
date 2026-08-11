import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
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

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const body = await request.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = await getServerCompanyId()

  const obs = body.reason === 'otro'
    ? `[${body.reason}] ${body.observations || ''}`
    : `[${body.reason}] ${body.observations || ''}`

  const rows = body.items.map((item: { product_id: string; quantity: number; unit_cost?: number }) => ({
    product_id: item.product_id,
    quantity: item.quantity,
    unit_cost: typeof item.unit_cost === 'number' && item.unit_cost > 0 ? item.unit_cost : 0,
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
    const { data: stockResult, error: stockError } = await supabase.rpc('decrement_stock', {
      p_product_id: row.product_id,
      p_quantity: row.quantity,
    })
    const result = stockResult as any
    if (stockError || result?.error) {
      await supabase.from('stock_withdrawals').delete().in('id', withdrawals.map((w: any) => w.id))
      return NextResponse.json({ error: friendlyStockError(result?.error || stockError?.message) }, { status: 500 })
    }
  }

  return NextResponse.json(withdrawals)
}
