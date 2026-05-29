const PAT = process.env.SUPABASE_PAT || process.argv[2]
const REF = 'qdjvkkapsgzdxskphyqf'
const API = `https://api.supabase.com/v1/projects/${REF}/database/query`
const H = { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' }

async function sql(q) {
  const r = await fetch(API, { method: 'POST', headers: H, body: JSON.stringify({ query: q }) })
  const t = await r.text()
  if (!r.ok) { console.log('ERROR:', t.substring(0, 200)); return null }
  try { return JSON.parse(t) } catch { return t }
}

(async () => {
  console.log('🔧 Insertando perfiles faltantes...')
  
  const r = await sql(`
    INSERT INTO public.profiles (id, full_name, email, role)
    SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.email), u.email,
      CASE WHEN u.email = 'admin@dibujarte.com' THEN 'admin' ELSE 'operative' END
    FROM auth.users u
    LEFT JOIN public.profiles p ON u.id = p.id
    WHERE p.id IS NULL
    ON CONFLICT (id) DO NOTHING
  `)
  console.log('Perfiles insertados:', r !== null ? '✅' : '❌')

  await sql(`UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@dibujarte.com' AND role != 'admin'`)

  const v = await sql('SELECT email, role, full_name FROM public.profiles')
  if (v) {
    console.log('\n📋 Perfiles finales:')
    v.forEach(p => console.log(`   • ${p.email} (${p.role}) - ${p.full_name}`))
  }

  console.log('\n✅ Todo listo! npm run dev')
  console.log('👤 admin@dibujarte.com / Admin123!')
})()
