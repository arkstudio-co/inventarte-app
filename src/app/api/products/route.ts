import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase/server'
import { getServerCompanyId } from '@/lib/supabase/company'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data, error } = await supabase
    .from('products')
    .select('*, suppliers(*)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const body = await request.json()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const companyId = await getServerCompanyId()

  const { data, error } = await supabase.from('products').insert({
    ...body,
    created_by: user.id,
    company_id: companyId,
  }).select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
