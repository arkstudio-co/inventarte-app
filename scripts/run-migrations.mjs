import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ ERROR: Variables de entorno no encontradas.')
  console.error('   Asegúrate de tener .env.local con:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

console.log('🔌 Conectando a Supabase...')
console.log(`   URL: ${supabaseUrl}`)

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function executeSQL(sql) {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql })
    if (error) throw error
    return true
  } catch (err) {
    throw err
  }
}

async function setupExecSQL() {
  const { error } = await supabase.from('_migrations').select('*').limit(1)
  if (!error) return

  console.log('\n⚠️  No se puede ejecutar SQL DDL directamente desde el cliente JS.')
  console.log('   Necesitas pegar el SQL en el SQL Editor de Supabase.')
  return false
}

async function insertSeedData() {
  console.log('\n🌱 Insertando datos semilla...')

  const seedPath = resolve(projectRoot, 'supabase', 'seed.sql')
  const seedSQL = readFileSync(seedPath, 'utf-8')

  const statements = seedSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s.length > 10)

  let successCount = 0
  let failCount = 0

  for (const stmt of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' })
      if (error) {
        console.log(`   ⚠️  ${error.message.substring(0, 80)}`)
        failCount++
      } else {
        successCount++
      }
    } catch (e) {
      failCount++
    }
  }

  if (failCount > 0 && successCount === 0) {
    console.log('   ⚠️  No se pudieron insertar datos automáticamente.')
    return false
  }
  return true
}

async function main() {
  console.log('🚀 Iniciando migraciones de Dibujarte...\n')

  const canExecDirect = await setupExecSQL()

  if (!canExecDirect) {
    const migrationPath = resolve(projectRoot, 'supabase', 'migrations', '00001_init.sql')
    const seedPath = resolve(projectRoot, 'supabase', 'seed.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    const seedSQL = readFileSync(seedPath, 'utf-8')

    console.log('\n📋 Debes ejecutar manualmente el SQL en el SQL Editor de Supabase.')
    console.log('\n══════════════════════════════════════════════════')
    console.log('  PASO 1: Abre https://supabase.com/dashboard')
    console.log('         Ve a tu proyecto > SQL Editor')
    console.log('\n  PASO 2: Copia y pega el contenido de:')
    console.log(`         📄 supabase/migrations/00001_init.sql`)
    console.log('         Haz clic en "RUN"')
    console.log('\n  PASO 3: Luego copia y pega:')
    console.log(`         📄 supabase/seed.sql`)
    console.log('         Haz clic en "RUN"')
    console.log('\n  PASO 4: ¡Listo! Inicia la app con: npm run dev')
    console.log('══════════════════════════════════════════════════\n')

    console.log('📄 Contenido de 00001_init.sql:')
    console.log('────────────────────────────────')
    console.log(migrationSQL.substring(0, 500) + '...')
    console.log(`\n   (${migrationSQL.length} caracteres totales)`)

    console.log('\n📄 Contenido de seed.sql:')
    console.log('────────────────────────────────')
    console.log(seedSQL.substring(0, 500) + '...')
    console.log(`\n   (${seedSQL.length} caracteres totales)`)

    console.log('\n❓ ¿Quieres que intente usar la Management API de Supabase?')
    console.log('   (Necesita un Personal Access Token de https://supabase.com/dashboard/account/tokens)')
    console.log('   Ejecuta: node scripts/run-migrations.mjs --use-mgmt-api <TOKEN>')
    return
  }

  const inserted = await insertSeedData()
  if (inserted) {
    console.log('\n✅ Migraciones completadas exitosamente!')
  }
}

main().catch(console.error)
