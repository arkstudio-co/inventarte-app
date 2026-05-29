'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Palette, Package, Eye, EyeOff, Trash2 } from 'lucide-react'
import type { Product, LandingProduct, ContactMessage } from '@/types/database'

export default function LandingAdminPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'products' | 'info' | 'messages'>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [landingProducts, setLandingProducts] = useState<any[]>([])
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [companyInfo, setCompanyInfo] = useState<any>(null)
  const [infoForm, setInfoForm] = useState({
    hero_title: '',
    hero_description: '',
    email: '',
    phone: '',
  })

  useEffect(() => {
    supabase.from('products').select('*').eq('is_active', true).then(({ data }) => {
      if (data) setProducts(data)
    })
    fetchLandingProducts()
    supabase.from('contact_messages').select('*').order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setMessages(data)
    })
    supabase.from('company_info').select('*').single().then(({ data }) => {
      if (data) {
        setCompanyInfo(data)
        setInfoForm({
          hero_title: data.hero_title,
          hero_description: data.hero_description,
          email: data.email,
          phone: data.phone,
        })
      }
    })
  }, [])

  const fetchLandingProducts = async () => {
    const { data } = await supabase
      .from('landing_products')
      .select('*, products(*)')
      .order('display_order')
    if (data) setLandingProducts(data)
  }

  const addToLanding = async (productId: string) => {
    await supabase.from('landing_products').insert({
      product_id: productId,
      display_order: landingProducts.length + 1,
      is_active: true,
    })
    fetchLandingProducts()
  }

  const removeFromLanding = async (id: string) => {
    await supabase.from('landing_products').delete().eq('id', id)
    fetchLandingProducts()
  }

  const toggleLandingProduct = async (id: string, isActive: boolean) => {
    await supabase.from('landing_products').update({ is_active: !isActive }).eq('id', id)
    fetchLandingProducts()
  }

  const saveCompanyInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (companyInfo) {
      await supabase.from('company_info').update(infoForm).eq('id', companyInfo.id)
    } else {
      await supabase.from('company_info').insert(infoForm)
    }
  }

  const markAsRead = async (id: string) => {
    await supabase.from('contact_messages').update({ is_read: true }).eq('id', id)
    const { data } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false })
    if (data) setMessages(data)
  }

  const tabs = [
    { id: 'products', label: 'Productos Vitrina' },
    { id: 'info', label: 'Información' },
    { id: 'messages', label: `Mensajes (${messages.filter(m => !m.is_read).length})` },
  ] as const

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-[var(--ink)]">Administrar Landing Page</h1>

      <div className="flex gap-1 border-b border-[var(--border-default)]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] cursor-pointer ${
              tab === t.id
                ? 'text-[var(--ink)] border-[var(--tint)]'
                : 'text-[var(--ink-tertiary)] border-transparent hover:text-[var(--ink-secondary)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[var(--ink-secondary)]">Catálogo</h2>
            {products.filter(p => !landingProducts.find(lp => lp.product_id === p.id)).map((p) => (
              <div key={p.id} className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-[var(--ink-tertiary)]" />
                  <span className="text-sm text-[var(--ink)]">{p.name}</span>
                </div>
                <Button size="sm" onClick={() => addToLanding(p.id)}>Agregar</Button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[var(--ink-secondary)]">En Vitrina</h2>
            {landingProducts.length === 0 ? (
              <div className="text-sm text-[var(--ink-tertiary)]">No hay productos en la vitrina</div>
            ) : (
              landingProducts.map((lp) => (
                <div key={lp.id} className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package size={16} className="text-[var(--ink-tertiary)]" />
                    <span className="text-sm text-[var(--ink)]">{lp.products?.name}</span>
                    <Badge variant={lp.is_active ? 'success' : 'default'}>{lp.is_active ? 'Visible' : 'Oculto'}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => toggleLandingProduct(lp.id, lp.is_active)} className="p-1.5 text-[var(--ink-tertiary)] hover:text-[var(--tint)] rounded-[var(--radius-sm)] cursor-pointer">
                      {lp.is_active ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button onClick={() => removeFromLanding(lp.id)} className="p-1.5 text-[var(--ink-tertiary)] hover:text-[var(--danger)] rounded-[var(--radius-sm)] cursor-pointer">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'info' && (
        <form onSubmit={saveCompanyInfo} className="max-w-lg space-y-4 rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-6">
          <Input label="Título del Hero" value={infoForm.hero_title} onChange={(e) => setInfoForm({ ...infoForm, hero_title: e.target.value })} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Descripción</label>
            <textarea className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none" rows={3} value={infoForm.hero_description} onChange={(e) => setInfoForm({ ...infoForm, hero_description: e.target.value })} />
          </div>
          <Input label="Correo de contacto" type="email" value={infoForm.email} onChange={(e) => setInfoForm({ ...infoForm, email: e.target.value })} />
          <Input label="Teléfono" value={infoForm.phone} onChange={(e) => setInfoForm({ ...infoForm, phone: e.target.value })} />
          <Button type="submit">Guardar</Button>
        </form>
      )}

      {tab === 'messages' && (
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-sm text-[var(--ink-tertiary)]">No hay mensajes</div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`rounded-[var(--radius-md)] border p-4 ${m.is_read ? 'bg-[var(--surface-1)] border-[var(--border-default)]' : 'bg-[var(--tint-light)] border-[var(--tint)]/30'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-[var(--ink)]">{m.name}</p>
                    <p className="text-xs text-[var(--ink-tertiary)]">{m.email} {m.phone && `• ${m.phone}`}</p>
                  </div>
                  {!m.is_read && (
                    <Button size="sm" variant="ghost" onClick={() => markAsRead(m.id)}>Marcar leído</Button>
                  )}
                </div>
                <p className="text-sm text-[var(--ink-secondary)]">{m.message}</p>
                <p className="text-xs text-[var(--ink-muted)] mt-2">{new Date(m.created_at).toLocaleDateString()}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
