import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const PAT = process.env.SUPABASE_PAT || process.argv[2]
const PROJECT_REF = 'qdjvkkapsgzdxskphyqf'
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`

const HEADERS = {
  'Authorization': `Bearer ${PAT}`,
  'Content-Type': 'application/json',
}

async function run() {
  console.log('🚀 Completando setup...\n')

  const seedSQL = readFileSync(resolve(projectRoot, 'supabase', 'seed.sql'), 'utf-8')

  process.stdout.write('📦 Insertando datos (seed.sql)... ')
  const res = await fetch(API, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ query: seedSQL }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.log(`❌ ${res.status}`)
    console.log(`   ${text.substring(0, 300)}`)
    process.exit(1)
  }

  console.log('✅\n')
  console.log('═══════════════════════════════════════════')
  console.log('  🎉 TODO COMPLETADO!')
  console.log('═══════════════════════════════════════════')
  console.log('\n  👤 admin@dibujarte.com / Admin123!')
  console.log('  👤 operativo@dibujarte.com / Operativo123!')
  console.log('\n  🚀 npm run dev')
}

run().catch(console.error)
