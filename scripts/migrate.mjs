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
    console.log(`     ${text.substring(0, 200)}`)
    return false
  }
  const data = await res.json()
  console.log(`✅ (${Array.isArray(data) ? data.length : 'ok'})`)
  return true
}

async function main() {
  console.log('🚀 Ejecutando migraciones via Management API...\n')

  // Migration
  const migrationSQL = readFileSync(resolve(projectRoot, 'supabase', 'migrations', '00001_init.sql'), 'utf-8')
  const ok = await runSQL(migrationSQL, 'Migración 00001_init.sql')
  if (!ok) process.exit(1)

  // Seed
  const seedSQL = readFileSync(resolve(projectRoot, 'supabase', 'seed.sql'), 'utf-8')
  const ok2 = await runSQL(seedSQL, 'Seed seed.sql')
  if (!ok2) process.exit(1)

  console.log('\n═══════════════════════════════════════════')
  console.log('  ✅ TODO COMPLETADO!')
  console.log('═══════════════════════════════════════════')
  console.log('\n  👤 admin@dibujarte.com / Admin123!')
  console.log('  👤 operativo@dibujarte.com / Operativo123!')
  console.log('\n  🚀 npm run dev')
}

main().catch(console.error)
