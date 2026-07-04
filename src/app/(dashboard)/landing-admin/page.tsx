'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Palette, Package, Eye, EyeOff, Trash2, Plus, Pencil } from 'lucide-react'
import type { Product, LandingProduct, ContactMessage, CommunityCompany } from '@/types/database'

export default function LandingAdminPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'products' | 'info' | 'messages' | 'community'>('products')
  const [communityTab, setCommunityTab] = useState<'text' | 'companies'>('text')
  const [products, setProducts] = useState<Product[]>([])
  const [landingProducts, setLandingProducts] = useState<any[]>([])
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [companyInfo, setCompanyInfo] = useState<any>(null)
  const [infoForm, setInfoForm] = useState({
    hero_title: '',
    hero_description: '',
    email: '',
    phone: '',
    community_title: '',
    community_description: '',
    founded_year: '',
  })
  const [communityCompanies, setCommunityCompanies] = useState<CommunityCompany[]>([])
  const [communityModalOpen, setCommunityModalOpen] = useState(false)
  const [editingCommunity, setEditingCommunity] = useState<CommunityCompany | null>(null)
  const [communityForm, setCommunityForm] = useState<{ name: string; logo_url: string; display_order: number | '' }>({ name: '', logo_url: '', display_order: 1 })
  const [communityUploading, setCommunityUploading] = useState(false)

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
          community_title: data.community_title || '',
          community_description: data.community_description || '',
          founded_year: data.founded_year?.toString() || '',
        })
      }
    })
    fetchCommunityCompanies()
  }, [])

  const fetchCommunityCompanies = async () => {
    const { data } = await supabase
      .from('community_companies')
      .select('*')
      .order('display_order')
    if (data) setCommunityCompanies(data)
  }

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
    { id: 'community', label: 'Clientes y Colaboradores' },
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

      {tab === 'community' && (
        <div className="space-y-4">
          <div className="flex gap-1 border-b border-[var(--border-default)]">
            <button
              onClick={() => setCommunityTab('text')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] cursor-pointer ${
                communityTab === 'text'
                  ? 'text-[var(--ink)] border-[var(--tint)]'
                  : 'text-[var(--ink-tertiary)] border-transparent hover:text-[var(--ink-secondary)]'
              }`}
            >
              Título y Descripción
            </button>
            <button
              onClick={() => setCommunityTab('companies')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] cursor-pointer ${
                communityTab === 'companies'
                  ? 'text-[var(--ink)] border-[var(--tint)]'
                  : 'text-[var(--ink-tertiary)] border-transparent hover:text-[var(--ink-secondary)]'
              }`}
            >
              Empresas
            </button>
          </div>

          {communityTab === 'text' && (
            <form onSubmit={async (e) => {
              e.preventDefault()
              if (companyInfo) {
                await supabase.from('company_info').update({
                  community_title: infoForm.community_title,
                  community_description: infoForm.community_description,
                }).eq('id', companyInfo.id)
                const { data } = await supabase.from('company_info').select('*').single()
                if (data) setCompanyInfo(data)
              }
            }} className="max-w-lg space-y-4 rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-6">
              <Input
                label="Título de la sección"
                value={infoForm.community_title}
                onChange={(e) => setInfoForm({ ...infoForm, community_title: e.target.value })}
              />
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[var(--ink-secondary)]">Descripción</label>
                <textarea
                  className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
                  rows={3}
                  value={infoForm.community_description}
                  onChange={(e) => setInfoForm({ ...infoForm, community_description: e.target.value })}
                />
              </div>
              <Button type="submit">Guardar</Button>
            </form>
          )}

          {communityTab === 'companies' && (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[var(--ink-secondary)]">Empresas e Instituciones</h2>
                <Button size="sm" onClick={() => {
                  setEditingCommunity(null)
                  setCommunityForm({ name: '', logo_url: '', display_order: communityCompanies.length + 1 })
                  setCommunityModalOpen(true)
                }}>
                  <Plus size={14} /> Agregar Empresa
                </Button>
              </div>

              {communityCompanies.length === 0 ? (
                <div className="text-sm text-[var(--ink-tertiary)]">No hay empresas registradas</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {communityCompanies.map((c) => {
                    const initials = c.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                    return (
                      <div key={c.id} className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4 flex items-center gap-4">
                        <div className="w-14 h-14 rounded-[var(--radius-sm)] bg-[var(--surface-2)] flex items-center justify-center overflow-hidden shrink-0">
                          {c.logo_url ? (
                            <img src={c.logo_url} alt={c.name} className="w-full h-full object-contain p-1" />
                          ) : (
                            <span className="text-sm font-bold text-[var(--tint)]">{initials}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--ink)] truncate">{c.name}</p>
                          <p className="text-xs text-[var(--ink-muted)]">Orden: {c.display_order}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant={c.is_active ? 'success' : 'default'}>{c.is_active ? 'Activo' : 'Inactivo'}</Badge>
                          <button
                            onClick={() => {
                              setEditingCommunity(c)
                              setCommunityForm({ name: c.name, logo_url: c.logo_url || '', display_order: c.display_order })
                              setCommunityModalOpen(true)
                            }}
                            className="p-1.5 text-[var(--ink-tertiary)] hover:text-[var(--tint)] hover:bg-[var(--tint-light)] rounded-[var(--radius-sm)] cursor-pointer"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={async () => {
                              await supabase.from('community_companies').update({ is_active: !c.is_active }).eq('id', c.id)
                              fetchCommunityCompanies()
                            }}
                            className="p-1.5 text-[var(--ink-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] rounded-[var(--radius-sm)] cursor-pointer"
                          >
                            {c.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`¿Eliminar ${c.name}?`)) return
                              await supabase.from('community_companies').delete().eq('id', c.id)
                              fetchCommunityCompanies()
                            }}
                            className="p-1.5 text-[var(--ink-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] rounded-[var(--radius-sm)] cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <Modal isOpen={communityModalOpen} onClose={() => setCommunityModalOpen(false)} title={editingCommunity ? 'Editar Empresa' : 'Agregar Empresa'}>
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  try {
                    const { error } = editingCommunity
                      ? await supabase.from('community_companies').update(communityForm).eq('id', editingCommunity.id)
                      : await supabase.from('community_companies').insert({ ...communityForm, is_active: true })

                    if (error) throw error
                    setCommunityModalOpen(false)
                    fetchCommunityCompanies()
                  } catch (err: any) {
                    alert('Error: ' + (err?.message || JSON.stringify(err)))
                  }
                }} className="space-y-4">
                  <Input label="Nombre de la empresa" value={communityForm.name} onChange={(e) => setCommunityForm({ ...communityForm, name: e.target.value })} required />
                  <Input label="Orden" type="number" value={communityForm.display_order} onChange={(e) => setCommunityForm({ ...communityForm, display_order: e.target.value === '' ? '' : Number(e.target.value) })} required />

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-[var(--ink-secondary)]">Logo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setCommunityUploading(true)
                        const formData = new FormData()
                        formData.append('file', file)
                        const res = await fetch('/api/upload', { method: 'POST', body: formData })
                        const data = await res.json()
                        if (data.url) {
                          setCommunityForm({ ...communityForm, logo_url: data.url })
                        }
                        setCommunityUploading(false)
                      }}
                      className="block w-full text-sm text-[var(--ink-secondary)] file:mr-2 file:py-1 file:px-3 file:rounded-[var(--radius-sm)] file:border-0 file:text-sm file:font-medium file:bg-[var(--tint)] file:text-[var(--ink)] hover:file:bg-[var(--tint-hover)] cursor-pointer"
                    />
                    {communityUploading && <p className="text-xs text-[var(--ink-tertiary)]">Subiendo logo...</p>}
                    {communityForm.logo_url && (
                      <div className="mt-2 w-16 h-16 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--border-default)]">
                        <img src={communityForm.logo_url} alt="Preview" className="w-full h-full object-contain" />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => setCommunityModalOpen(false)}>Cancelar</Button>
                    <Button type="submit">{editingCommunity ? 'Guardar cambios' : 'Agregar Empresa'}</Button>
                  </div>
                </form>
              </Modal>
            </>
          )}
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
          <Input label="Año de fundación" type="number" value={infoForm.founded_year} onChange={(e) => setInfoForm({ ...infoForm, founded_year: e.target.value })} />
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
