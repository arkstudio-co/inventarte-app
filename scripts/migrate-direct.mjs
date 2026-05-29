import pkg from 'pg'
const { Client } = pkg
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const PASSWORD = '1PY1NFrLtM2MLS5L'
const PROJECT_REF = 'qdjvkkapsgzdxskphyqf'

// All possible Supabase pooler regions
const REGIONS = [
  'us-west-1', 'us-east-1', 'us-east-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3',
  'eu-central-1', 'eu-central-2',
  'eu-north-1',
  'ca-central-1',
  'sa-east-1',
  'ap-southeast-1', 'ap-southeast-2',
  'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
  'ap-south-1',
  'me-central-1',
  'af-south-1',
]

async function tryConnect(connectionString, label) {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  })
  await client.connect()
  return client
}

async function run() {
  let client = null
  let usedConn = ''

  // Build all connection strings
  const connStrings = [
    // Try direct connection first
    { str: `postgresql://postgres:${PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`, label: 'Direct' },
  ]

  // Add all pooler regions
  for (const region of REGIONS) {
    connStrings.push({
      str: `postgresql://postgres.${PROJECT_REF}:${PASSWORD}@aws-0-${region}.pooler.supabase.com:6543/postgres`,
      label: `Pooler ${region} (transaction)`,
    })
    connStrings.push({
      str: `postgresql://postgres.${PROJECT_REF}:${PASSWORD}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
      label: `Pooler ${region} (session)`,
    })
  }

  for (const { str, label } of connStrings) {
    try {
      process.stdout.write(`🔌 ${label}... `)
      client = await tryConnect(str, label)
      console.log('✅ Conectado!')
      usedConn = str
      break
    } catch (err) {
      console.log(`❌ ${err.message.substring(0, 60)}`)
    }
  }

  if (!client) {
    console.error('\n❌ No se pudo conectar a la base de datos.')
    console.error('\n📋 Solución: abre el SQL Editor de Supabase y pega:')
    console.error('   1. supabase/migrations/00001_init.sql')
    console.error('   2. supabase/seed.sql')
    process.exit(1)
  }

  try {
    console.log('\n📦 Ejecutando migración...')
    const migrationSQL = readFileSync(resolve(projectRoot, 'supabase', 'migrations', '00001_init.sql'), 'utf-8')
    const fixedSQL = migrationSQL.replace(
      'CREATE OR REPLACE TRIGGER on_auth_user_created',
      'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;\nCREATE TRIGGER on_auth_user_created'
    )
    await client.query(fixedSQL)
    console.log('✅ Migración completada!')

    console.log('\n🌱 Ejecutando seed...')
    const seedSQL = readFileSync(resolve(projectRoot, 'supabase', 'seed.sql'), 'utf-8')
    await client.query(seedSQL)
    console.log('✅ Seed completado!')

    console.log('\n═══════════════════════════════════════════')
    console.log('  🎉 TODO LISTO!')
    console.log('═══════════════════════════════════════════')
    console.log('\n  👤 admin@dibujarte.com / Admin123!')
    console.log('  👤 operativo@dibujarte.com / Operativo123!')
    console.log('\n  🚀 npm run dev')
  } catch (err) {
    console.error('\n❌ Error:', err.message)
    console.error('\n📋 Prueba pegando el SQL manualmente en el SQL Editor de Supabase.')
  } finally {
    await client.end()
  }
}

run()
