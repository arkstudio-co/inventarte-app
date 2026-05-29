import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variables de entorno no encontradas.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('🌱 Sembrando datos en Supabase...\n')

  // Check existing users
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const adminUser = users?.find(u => u.email === 'admin@dibujarte.com')

  if (!adminUser) {
    console.log('👤 Creando usuarios...')
    for (const u of [
      { email: 'admin@dibujarte.com', password: 'Admin123!', name: 'Admin Dibujarte', role: 'admin' },
      { email: 'operativo@dibujarte.com', password: 'Operativo123!', name: 'Operativo Dibujarte', role: 'operative' },
    ]) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email, password: u.password, email_confirm: true,
        user_metadata: { full_name: u.name },
      })
      if (error) {
        console.log(`   ❌ ${u.email}: ${error.message}`)
      } else {
        console.log(`   ✅ ${u.email} creado`)
        const { error: pe } = await supabase.from('profiles').upsert({
          id: data.user.id, full_name: u.name, email: u.email, role: u.role,
        })
        if (pe) console.log(`      ⚠️  ${pe.message}`)
      }
    }
  } else {
    console.log('👤 Usuarios ya existen')
  }

  // Seed suppliers & products
  const { data: existingSuppliers } = await supabase.from('suppliers').select('id').limit(1)
  if (existingSuppliers && existingSuppliers.length > 0) {
    console.log('📦 Proveedores ya existen')
    return
  }

  console.log('\n📦 Creando proveedores...')
  const { data: s, error: se } = await supabase.from('suppliers').insert([
    { name: 'Papelera Nacional', contact: 'Carlos López', email: 'carlos@papeleranacional.com', phone: '3001234567' },
    { name: 'Art Supplies Colombia', contact: 'María García', email: 'maria@artsupplies.co', phone: '3107654321' },
    { name: 'Distribuidora de Arte', contact: 'Pedro Martínez', email: 'pedro@distribuidoraarte.com', phone: '3209876543' },
  ]).select()
  if (se) { console.log(`   ❌ ${se.message}`); return }
  console.log(`   ✅ ${s.length} proveedores: ${s.map(x => x.name).join(', ')}`)

  // Find admin user again in case they were just created
  const { data: { users: updatedUsers } } = await supabase.auth.admin.listUsers()
  const admin = updatedUsers?.find(u => u.email === 'admin@dibujarte.com')
  if (!admin) { console.log('   ❌ Admin user not found'); return }

  console.log('\n📦 Creando productos...')
  const products = [
    { sku: 'ART-1A2-B3C', name: 'Block de Dibujo A3', description: 'Block profesional de dibujo, papel 120g/m², 50 hojas', stock: 45, min_stock: 10, price: 25000, cost: 15000, supplier_id: s[0].id, created_by: admin.id },
    { sku: 'LAP-4D5-E6F', name: 'Lápiz Grafito Profesional 2B', description: 'Lápiz de dibujo profesional, mina 2B, pack x12', stock: 120, min_stock: 20, price: 18000, cost: 9000, supplier_id: s[1].id, created_by: admin.id },
    { sku: 'ACU-7G8-H9I', name: 'Acuarelas 24 Colores', description: 'Estuche de acuarelas profesionales, 24 colores vibrantes', stock: 30, min_stock: 5, price: 65000, cost: 38000, supplier_id: s[1].id, created_by: admin.id },
    { sku: 'PIN-J1K-2L3', name: 'Pinceles Set x10', description: 'Set de pinceles profesionales, diferentes puntas y grosores', stock: 25, min_stock: 8, price: 42000, cost: 25000, supplier_id: s[2].id, created_by: admin.id },
    { sku: 'MAR-4M5-N6O', name: 'Marcadores Puntilla 12 colores', description: 'Marcadores de punta fina para lettering y detalles', stock: 80, min_stock: 15, price: 35000, cost: 20000, supplier_id: s[1].id, created_by: admin.id },
    { sku: 'OLE-7P8-Q9R', name: 'Óleo Profesional Set x12', description: 'Pintura al óleo profesional, colores básicos, tubos 37ml', stock: 15, min_stock: 3, price: 120000, cost: 75000, supplier_id: s[2].id, created_by: admin.id },
    { sku: 'CAR-S1T-2U3', name: 'Cartulina Opalina x10', description: 'Pliego de cartulina opalina, colores variados, pack x10', stock: 200, min_stock: 30, price: 15000, cost: 8000, supplier_id: s[0].id, created_by: admin.id },
    { sku: 'LIQ-V4W-5X6', name: 'Líquido Corrector 20ml', description: 'Corrector líquido blanco, secado rápido', stock: 300, min_stock: 50, price: 5000, cost: 2500, supplier_id: s[0].id, created_by: admin.id },
  ]

  const { data: p, error: pe2 } = await supabase.from('products').insert(products).select()
  if (pe2) { console.log(`   ❌ ${pe2.message}`); return }
  console.log(`   ✅ ${p.length} productos creados`)

  await supabase.from('company_info').upsert({
    hero_title: 'Dibujarte Editores',
    hero_description: 'Tu proveedor de confianza en materiales de arte y papelería. Calidad y variedad para dar vida a tus proyectos creativos.',
    email: 'eldice16@gmail.com',
    phone: '3001234567',
  })
  console.log('   ✅ Info de empresa creada')

  console.log('\n═══════════════════════════════════════════')
  console.log('  🎉 SEED COMPLETADO!')
  console.log('═══════════════════════════════════════════')
  console.log('\n  👤 admin@dibujarte.com / Admin123!')
  console.log('  👤 operativo@dibujarte.com / Operativo123!')
  console.log('\n  🚀 npm run dev')
}

main().catch(console.error)
