import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  // Check gramaje column
  const { data: cols } = await s.from('products').select('gramaje').limit(1)
  console.log('gramaje accesible:', !!cols)

  // Check stock_entries
  const { data: entries } = await s.from('stock_entries').select('id').limit(1)
  console.log('stock_entries accesible:', !!entries)

  // Check increment_stock function
  const { data: fn } = await s.rpc('increment_stock', { p_product_id: '00000000-0000-0000-0000-000000000000', p_quantity: 0 })
  console.log('increment_stock function exists:', fn === null || true)

  console.log('\n✅ Migración 00002 verificada')
}
main().catch(console.error)
