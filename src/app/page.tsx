'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { loginSchema } from '@/lib/validations/auth'
import { contactSchema } from '@/lib/validations/contact'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  Package,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  CheckCircle,
  Globe,
} from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [landingProducts, setLandingProducts] = useState<any[]>([])
  const [companyInfo, setCompanyInfo] = useState<any>(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [contactSent, setContactSent] = useState(false)
  const [contactError, setContactError] = useState('')

  useEffect(() => {
    supabase
      .from('landing_products')
      .select('*, products(*)')
      .eq('is_active', true)
      .order('display_order')
      .then(({ data }) => { if (data) setLandingProducts(data) })

    supabase.from('company_info').select('*').single().then(({ data }) => {
      if (data) setCompanyInfo(data)
    })
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError('')

    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword })
    if (!result.success) {
      setLoginError(result.error.issues[0].message)
      return
    }

    setIsLoggingIn(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })

    if (error) {
      setLoginError('Credenciales inválidas')
      setIsLoggingIn(false)
      return
    }

    router.push('/dashboard')
  }

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault()
    setContactError('')

    const result = contactSchema.safeParse(contactForm)
    if (!result.success) {
      setContactError(result.error.issues[0].message)
      return
    }

    const { error } = await supabase.from('contact_messages').insert(contactForm)
    if (error) {
      setContactError(error.message)
      return
    }

    setContactSent(true)
  }

  return (
    <div className="min-h-screen bg-[var(--surface-0)]">
      {/* Header */}
      <header className="border-b border-[var(--border-default)]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--tint)] flex items-center justify-center">
              <span className="text-sm font-bold text-[var(--ink)]">D</span>
            </div>
            <span className="font-semibold text-[var(--ink)]">Dibujarte</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-[var(--ink-secondary)]">
            <a href="#productos" className="hover:text-[var(--ink)] transition-colors">Productos</a>
            <a href="#trayectoria" className="hover:text-[var(--ink)] transition-colors">Trayectoria</a>
            <a href="#contacto" className="hover:text-[var(--ink)] transition-colors">Contacto</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl lg:text-5xl font-bold text-[var(--ink)] leading-tight">
              {companyInfo?.hero_title || 'Dibujarte Editores'}
            </h1>
            <p className="text-lg text-[var(--ink-secondary)] leading-relaxed">
              {companyInfo?.hero_description || 'Tu proveedor de confianza en materiales de arte y papelería. Calidad y variedad para dar vida a tus proyectos creativos.'}
            </p>

            {/* Login Form inline */}
            <form onSubmit={handleLogin} className="space-y-3 max-w-sm">
              <Input
                placeholder="Correo electrónico"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
              <Input
                placeholder="Contraseña"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
              {loginError && (
                <p className="text-sm text-[var(--danger)]">{loginError}</p>
              )}
              <Button type="submit" className="w-full" disabled={isLoggingIn}>
                {isLoggingIn ? 'Ingresando...' : 'Iniciar Sesión'}
              </Button>
              <div className="text-center">
                <a href="/forgot-password" className="text-xs text-[var(--accent)] hover:underline">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            </form>
          </div>

          <div className="aspect-[4/3] rounded-[var(--radius-lg)] bg-[var(--surface-1)] border border-[var(--border-default)] flex items-center justify-center">
            <div className="text-center p-8">
              <Package size={64} className="mx-auto mb-4 text-[var(--tint)]" />
              <p className="text-[var(--ink-tertiary)]">Imagen principal</p>
            </div>
          </div>
        </div>
      </section>

      {/* Products Showcase */}
      <section id="productos" className="border-t border-[var(--border-default)] py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-[var(--ink)] mb-8 text-center">Nuestros Productos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {landingProducts.map((lp) => (
              <div
                key={lp.id}
                className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] overflow-hidden hover:bg-[var(--surface-2)]/50 transition-colors"
              >
                <div className="aspect-square bg-[var(--surface-2)] flex items-center justify-center">
                  {lp.products?.image_url ? (
                    <img src={lp.products.image_url} alt={lp.products.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package size={48} className="text-[var(--ink-muted)]" />
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-semibold text-[var(--ink)]">{lp.products?.name}</h3>
                  {lp.products?.description && (
                    <p className="text-sm text-[var(--ink-tertiary)] line-clamp-2">{lp.products.description}</p>
                  )}
                  {lp.products?.price && (
                    <p className="text-lg font-bold text-[var(--tint)]">${lp.products.price.toLocaleString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trajectory */}
      <section id="trayectoria" className="border-t border-[var(--border-default)] py-16 bg-[var(--surface-1)]">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-[var(--ink)] mb-8 text-center">Nuestra Trayectoria</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--tint-light)] flex items-center justify-center">
                <CheckCircle size={24} className="text-[var(--tint)]" />
              </div>
              <h3 className="font-semibold text-[var(--ink)] mb-2">Experiencia</h3>
              <p className="text-sm text-[var(--ink-tertiary)]">Años de experiencia en el mercado de papelería y arte.</p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--tint-light)] flex items-center justify-center">
                <Package size={24} className="text-[var(--tint)]" />
              </div>
              <h3 className="font-semibold text-[var(--ink)] mb-2">Calidad</h3>
              <p className="text-sm text-[var(--ink-tertiary)]">Productos seleccionados con los más altos estándares.</p>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--tint-light)] flex items-center justify-center">
                <MapPin size={24} className="text-[var(--tint)]" />
              </div>
              <h3 className="font-semibold text-[var(--ink)] mb-2">Cobertura</h3>
              <p className="text-sm text-[var(--ink-tertiary)]">Atendiendo a clientes en toda la región.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contacto" className="border-t border-[var(--border-default)] py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-[var(--ink)] mb-8 text-center">Contacto</h2>
          <div className="grid lg:grid-cols-2 gap-12 max-w-3xl mx-auto">
            <div className="space-y-4">
              {contactSent ? (
                <div className="rounded-[var(--radius-md)] bg-[var(--success-light)] border border-[var(--success)]/30 p-6 text-center">
                  <CheckCircle size={40} className="mx-auto mb-3 text-[var(--success)]" />
                  <p className="text-sm font-medium text-[var(--success)]">Mensaje enviado con éxito</p>
                </div>
              ) : (
                <form onSubmit={handleContact} className="space-y-4">
                  <Input
                    placeholder="Nombre"
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Correo electrónico"
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Teléfono (opcional)"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  />
                  <div className="space-y-1.5">
                    <textarea
                      className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-1)] text-[var(--ink)] border border-[var(--border-default)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-none"
                      rows={4}
                      placeholder="Mensaje"
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      required
                    />
                  </div>
                  {contactError && <p className="text-sm text-[var(--danger)]">{contactError}</p>}
                  <Button type="submit">Enviar Mensaje</Button>
                </form>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)]">
                <Mail size={20} className="text-[var(--tint)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">Correo</p>
                  <p className="text-sm text-[var(--ink-tertiary)]">{companyInfo?.email || 'eldice16@gmail.com'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)]">
                <Phone size={20} className="text-[var(--tint)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">Teléfono</p>
                  <p className="text-sm text-[var(--ink-tertiary)]">{companyInfo?.phone || '(000) 000-0000'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-default)] py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-[var(--ink-tertiary)]">
          {companyInfo?.social_links && Object.keys(companyInfo.social_links).length > 0 && (
            <div className="flex items-center justify-center gap-4 mb-4">
              {Object.entries(companyInfo.social_links as Record<string, string>).map(([key, url]) => (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[var(--ink-secondary)] hover:text-[var(--accent)] transition-colors capitalize"
                >
                  <Globe size={14} />
                  {key}
                </a>
              ))}
            </div>
          )}
          <p>&copy; {new Date().getFullYear()} Dibujarte Editores. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
