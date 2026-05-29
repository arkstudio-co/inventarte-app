import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const PAT = process.env.SUPABASE_PAT || process.argv[2]
const PROJECT_REF = 'qdjvkkapsgzdxskphyqf'
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`

async function runSQL(sql, label) {
  process.stdout.write(`  ${label}... `)
  const res = await fetch(API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) {
    const text = await res.text()
    console.log(`❌ ${res.status}`)
    console.log(`     ${text.substring(0, 300)}`)
    return false
  }
  const data = await res.json()
  console.log(`✅ (${Array.isArray(data) ? data.length : 'ok'})`)
  return true
}

async function main() {
  console.log('🚀 Ejecutando migración 00002...\n')

  const sql = readFileSync(resolve(projectRoot, 'supabase', 'migrations', '00002_inventory_enhancements.sql'), 'utf-8')

  // Step 1: ALTER + CREATE TABLE + CREATE INDEX
  const step1 = `
ALTER TABLE products ADD COLUMN IF NOT EXISTS gramaje DECIMAL(10,2);
CREATE TABLE IF NOT EXISTS stock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  observations TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_stock_entries_product ON stock_entries(product_id);
`
  const r1 = await runSQL(step1, 'Schema: gramaje + stock_entries table')

  // Step 2: Function (needs to be separate due to dollar-quoting)
  const step2 = `CREATE OR REPLACE FUNCTION increment_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE products SET stock = stock + p_quantity WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;`
  const r2 = await runSQL(step2, 'Function: increment_stock')

  // Step 3: RLS
  const step3 = `
ALTER TABLE stock_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read stock entries" ON stock_entries
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert stock entries" ON stock_entries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
`
  const r3 = await runSQL(step3, 'RLS: stock_entries policies')

  console.log('\n✅ Migración 00002 completada')
}

main().catch(console.error)
