import pkg from 'pg'
const { Client } = pkg
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import dns from 'dns'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const PASSWORD = '1PY1NFrLtM2MLS5L'
const PROJECT_REF = 'qdjvkkapsgzdxskphyqf'
const HOST = `db.${PROJECT_REF}.supabase.co`

async function resolveHost(hostname) {
  return new Promise((resolve, reject) => {
    dns.resolve6(hostname, (err, addresses) => {
      if (err) reject(err)
      else resolve(addresses)
    })
  })
}

async function run() {
  console.log('🔍 Resolviendo DNS...')

  let ipv6
  try {
    ipv6 = await resolveHost(HOST)
    console.log(`   IPv6: ${ipv6[0]}`)
  } catch {
    console.log('   ❌ No se pudo resolver IPv6')
  }

  const connStrings = []

  if (ipv6) {
    connStrings.push({
      str: `postgresql://postgres:${PASSWORD}@${ipv6[0]}:5432/postgres`,
      label: `Directo IPv6 (${ipv6[0]})`,
      host: ipv6[0],
    })
  }

  // Try with host and explicit ssl hostname for SNI
  for (const { str, label, host } of connStrings) {
    try {
      process.stdout.write(`🔌 ${label}... `)
      const client = new Client({
        connectionString: str,
        ssl: {
          rejectUnauthorized: false,
          servername: HOST, // SNI needs the real hostname
        },
        connectionTimeoutMillis: 10000,
      })
      await client.connect()
      console.log('✅ Conectado!')

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

      await client.end()
      return
    } catch (err) {
      console.log(`❌ ${err.message.substring(0, 80)}`)
    }
  }

  // Fallback: try via API
  console.log('\n⚠️  No se pudo conectar directamente.')
  console.log('   Intentando via REST API con service_role...\n')

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Check if tables exist
  const { error } = await supabase.from('products').select('id').limit(1)
  if (error && error.code === '42P01') {
    console.log('❌ Las tablas NO existen y no podemos crearlas automáticamente.')
    console.log('\n📋 Por favor:')
    console.log('   1. Abre: https://supabase.com/dashboard > SQL Editor')
    console.log('   2. Copia supabase/migrations/00001_init.sql y ejecútalo')
    console.log('   3. Copia supabase/seed.sql y ejecútalo')
    console.log('   4. npm run dev')
    return
  }

  // Tables exist, try creating users and data via API
  console.log('✅ Tablas existen. Creando datos via API...')

  const { data: { users } } = await supabase.auth.admin.listUsers()
  const existingAdmin = users?.find(u => u.email === 'admin@dibujarte.com')

  if (!existingAdmin) {
    for (const u of [
      { email: 'admin@dibujarte.com', password: 'Admin123!', name: 'Admin Dibujarte', role: 'admin' },
      { email: 'operativo@dibujarte.com', password: 'Operativo123!', name: 'Operativo Dibujarte', role: 'operative' },
    ]) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email, password: u.password, email_confirm: true,
        user_metadata: { full_name: u.name },
      })
      if (error) console.log(`   ❌ ${u.email}: ${error.message}`)
      else {
        console.log(`   ✅ ${u.email} creado`)
        await supabase.from('profiles').upsert({
          id: data.user.id, full_name: u.name, email: u.email, role: u.role,
        })
      }
    }
  } else {
    console.log('   👤 Usuarios ya existen')
  }

  // Seed suppliers and products
  const { data: existingSuppliers } = await supabase.from('suppliers').select('id').limit(1)
  if (!existingSuppliers || existingSuppliers.length === 0) {
    const { data: s } = await supabase.from('suppliers').insert([
      { name: 'Papelera Nacional', email: 'carlos@papeleranacional.com' },
      { name: 'Art Supplies Colombia', email: 'maria@artsupplies.co' },
      { name: 'Distribuidora de Arte', email: 'pedro@distribuidoraarte.com' },
    ]).select()

    const admin = (await supabase.auth.admin.listUsers()).data?.users?.find(u => u.email === 'admin@dibujarte.com')
    if (s && admin) {
      await supabase.from('products').insert([
        { sku: 'ART-1A2-B3C', name: 'Block de Dibujo A3', stock: 45, min_stock: 10, price: 25000, cost: 15000, supplier_id: s[0].id, created_by: admin.id },
        { sku: 'LAP-4D5-E6F', name: 'Lápiz Grafito 2B', stock: 120, min_stock: 20, price: 18000, cost: 9000, supplier_id: s[1].id, created_by: admin.id },
        { sku: 'ACU-7G8-H9I', name: 'Acuarelas 24 Colores', stock: 30, min_stock: 5, price: 65000, cost: 38000, supplier_id: s[1].id, created_by: admin.id },
        { sku: 'OLE-7P8-Q9R', name: 'Óleo Profesional Set x12', stock: 15, min_stock: 3, price: 120000, cost: 75000, supplier_id: s[2].id, created_by: admin.id },
      ])
      console.log('   ✅ Productos creados')
    }
  }

  console.log('\n═══════════════════════════════════════════')
  console.log('  🎉 INICIALIZACIÓN COMPLETADA!')
  console.log('═══════════════════════════════════════════')
  console.log('\n  👤 admin@dibujarte.com / Admin123!')
  console.log('  👤 operativo@dibujarte.com / Operativo123!')
  console.log('\n  🚀 npm run dev')
}

run().catch(console.error)
