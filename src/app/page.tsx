'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, registerSchema } from '@/lib/validations/auth'
import { contactSchema } from '@/lib/validations/contact'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CompanyCarousel } from '@/components/landing/CompanyCarousel'
import { LandingFooter } from '@/components/landing/LandingFooter'
import {
  Package,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react'

const fallbackComunidad = [
  { name: 'Colegio San José', logo_url: null },
  { name: 'Gimnasio Campestre', logo_url: null },
  { name: 'Colegio Anglo Americano', logo_url: null },
  { name: 'Instituto Técnico Central', logo_url: null },
]

export default function LandingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [companyInfo, setCompanyInfo] = useState<any>(null)
  const [communityCompanies, setCommunityCompanies] = useState<any[]>([])
  const [totalCompanyCount, setTotalCompanyCount] = useState(0)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [isRegisterMode, setIsRegisterMode] = useState(false)
  const [registerForm, setRegisterForm] = useState({ full_name: '', email: '', password: '', confirmPassword: '' })
  const [registerError, setRegisterError] = useState('')
  const [registerSuccess, setRegisterSuccess] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [contactSent, setContactSent] = useState(false)
  const [contactError, setContactError] = useState('')

  useEffect(() => {
    supabase.from('company_info').select('*').single().then(({ data }) => {
      if (data) setCompanyInfo(data)
    })
    supabase.from('community_companies').select('*').eq('is_active', true).order('display_order').then(({ data }) => {
      if (data) setCommunityCompanies(data)
    })
    supabase.from('community_companies').select('id', { count: 'exact', head: true }).then(({ count }) => {
      if (count !== null) setTotalCompanyCount(count)
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

    router.push('/wallet')
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegisterError('')

    const result = registerSchema.safeParse(registerForm)
    if (!result.success) {
      setRegisterError(result.error.issues[0].message)
      return
    }

    setIsRegistering(true)
    const { error } = await supabase.auth.signUp({
      email: registerForm.email,
      password: registerForm.password,
      options: {
        data: { full_name: registerForm.full_name },
      },
    })

    if (error) {
      setRegisterError(error.message)
      setIsRegistering(false)
      return
    }

    setRegisterSuccess(true)
    setIsRegistering(false)
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-[var(--primary)]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--accent)] flex items-center justify-center">
              <span className="text-sm font-bold text-white">D</span>
            </div>
            <span className="font-semibold text-white">Dibujarte</span>
          </div>
          <nav className="hidden sm:flex items-center gap-6 text-sm text-white/80">
            <a href="#trayectoria" className="hover:text-white transition-colors">Trayectoria</a>
            <a href="#contacto" className="hover:text-white transition-colors">Contacto</a>
            <a href="#acceso" className="inline-flex items-center gap-1.5 text-white bg-white/15 hover:bg-white/25 px-4 py-1.5 rounded-[var(--radius-md)] transition-colors">
              Acceder
              <ArrowRight size={14} />
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section id="acceso" className="bg-gradient-to-b from-[var(--primary)] to-white">
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[var(--radius-full)] bg-white/20 text-white/90 text-xs font-medium">
                <ShieldCheck size={14} />
                Sistema de gestión de inventario
              </div>
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-[1.08] tracking-[-0.02em]">
                {companyInfo?.hero_title || 'Dibujarte Editores'}
              </h1>
              <p className="text-lg text-white/70 leading-relaxed max-w-lg">
                {companyInfo?.hero_description || 'Tu proveedor de confianza en materiales de arte y papelería. Calidad y variedad para dar vida a tus proyectos creativos.'}
              </p>

              {/* Stats */}
              <div className="flex gap-8 pt-4">
                <div>
                  <p className="text-3xl font-bold text-[var(--accent)]">
                    +{companyInfo?.founded_year ? new Date().getFullYear() - companyInfo.founded_year : 0}
                  </p>
                  <span className="text-xs text-white/60 uppercase tracking-wider">años</span>
                </div>
                <div>
                  <p className="text-3xl font-bold text-[var(--accent)]">+{totalCompanyCount}</p>
                  <span className="text-xs text-white/60 uppercase tracking-wider">empresas</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[var(--radius-xl)] shadow-[var(--shadow-elevated)] p-6 lg:p-8">
              <div className="flex rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-0.5 mb-6">
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(false); setRegisterError(''); setRegisterSuccess(false) }}
                  className={`flex-1 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
                    !isRegisterMode
                      ? 'bg-white text-[var(--ink)] shadow-[var(--shadow-card)]'
                      : 'text-[var(--ink-tertiary)] hover:text-[var(--ink)]'
                  }`}
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(true); setLoginError('') }}
                  className={`flex-1 py-2 text-sm font-medium rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
                    isRegisterMode
                      ? 'bg-white text-[var(--ink)] shadow-[var(--shadow-card)]'
                      : 'text-[var(--ink-tertiary)] hover:text-[var(--ink)]'
                  }`}
                >
                  Registrarse
                </button>
              </div>

              {registerSuccess ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--success-light)] flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={24} className="text-[var(--success)]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[var(--ink)] mb-1">Registro exitoso</h3>
                  <p className="text-sm text-[var(--ink-tertiary)] mb-4">Ahora puedes iniciar sesión con tu cuenta.</p>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => { setIsRegisterMode(false); setRegisterSuccess(false) }}
                  >
                    Iniciar Sesión
                  </Button>
                </div>
              ) : isRegisterMode ? (
                <form onSubmit={handleRegister} className="space-y-4">
                  <Input
                    placeholder="Nombre completo"
                    value={registerForm.full_name}
                    onChange={(e) => setRegisterForm({ ...registerForm, full_name: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Correo electrónico"
                    type="email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Contraseña"
                    type="password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    required
                  />
                  <Input
                    placeholder="Confirmar contraseña"
                    type="password"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                    required
                  />
                  {registerError && (
                    <p className="text-sm text-[var(--danger)]">{registerError}</p>
                  )}
                  <Button type="submit" className="w-full" disabled={isRegistering}>
                    {isRegistering ? 'Registrando...' : 'Crear Cuenta'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="space-y-4">
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
                    <a href="/forgot-password" className="text-xs text-[var(--primary)] hover:underline">
                      ¿Olvidaste tu contraseña?
                    </a>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Trajectory */}
      <section id="trayectoria" className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-[var(--ink)] tracking-[-0.02em] mb-4">
              Nuestra Trayectoria
            </h2>
            <p className="text-[var(--ink-tertiary)] leading-relaxed">
              Más de una década ofreciendo los mejores materiales de arte y papelería a instituciones educativas y clientes en toda la región.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--border)] p-8 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow duration-200">
              <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--primary-light)] flex items-center justify-center mb-5">
                <TrendingUp size={24} className="text-[var(--primary)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--ink)] mb-2">Experiencia</h3>
              <p className="text-sm text-[var(--ink-tertiary)] leading-relaxed">
                Años de experiencia en el mercado de papelería y arte, con un profundo conocimiento de las necesidades de nuestros clientes.
              </p>
            </div>
            <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--border)] p-8 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow duration-200">
              <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--accent-light)] flex items-center justify-center mb-5">
                <CheckCircle size={24} className="text-[var(--accent)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--ink)] mb-2">Calidad</h3>
              <p className="text-sm text-[var(--ink-tertiary)] leading-relaxed">
                Productos seleccionados con los más altos estándares, garantizando la mejor experiencia para tus proyectos creativos.
              </p>
            </div>
            <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--border)] p-8 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-card-hover)] transition-shadow duration-200">
              <div className="w-12 h-12 rounded-[var(--radius-lg)] bg-[var(--primary-light)] flex items-center justify-center mb-5">
                <Users size={24} className="text-[var(--primary)]" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--ink)] mb-2">Cobertura</h3>
              <p className="text-sm text-[var(--ink-tertiary)] leading-relaxed">
                Atendiendo a clientes en toda la región con una red de distribución confiable y eficiente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Community */}
      <section className="bg-[var(--surface-muted)] py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-[var(--ink)] tracking-[-0.02em] mb-4">
              {companyInfo?.community_title || 'Clientes y Colaboradores'}
            </h2>
            <p className="text-[var(--ink-tertiary)] leading-relaxed">
              {companyInfo?.community_description || 'Empresas e instituciones que confían en nuestros productos'}
            </p>
          </div>
          <CompanyCarousel companies={communityCompanies.length > 0 ? communityCompanies : fallbackComunidad} />
        </div>
      </section>

      {/* Contact */}
      <section id="contacto" className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl lg:text-4xl font-bold text-[var(--ink)] tracking-[-0.02em] mb-4">Contacto</h2>
            <p className="text-[var(--ink-tertiary)] leading-relaxed">
              Estamos aquí para ayudarte. Escríbenos y te responderemos a la brevedad.
            </p>
          </div>
          <div className="grid lg:grid-cols-5 gap-8 max-w-4xl mx-auto">
            <div className="lg:col-span-3">
              {contactSent ? (
                <div className="bg-[var(--success-light)] border border-[var(--success)]/30 rounded-[var(--radius-xl)] p-8 text-center">
                  <CheckCircle size={48} className="mx-auto mb-4 text-[var(--success)]" />
                  <p className="text-lg font-semibold text-[var(--success)]">Mensaje enviado con éxito</p>
                  <p className="text-sm text-[var(--success)]/70 mt-1">Te contactaremos pronto.</p>
                </div>
              ) : (
                <div className="rounded-[var(--radius-xl)] bg-[var(--surface-1)] border border-[var(--border-default)] p-6">
                  <form onSubmit={handleContact} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    </div>
                    <Input
                      placeholder="Teléfono (opcional)"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    />
                    <div className="space-y-1.5">
                      <textarea
                        className="w-full px-3.5 py-2.5 text-sm rounded-[var(--radius-md)] bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] placeholder:text-[var(--ink-muted)] hover:border-[var(--border-strong)] focus:outline-none focus:border-[var(--primary)] focus:shadow-[0_0_0_3px_rgba(26,95,122,0.12)] transition-all duration-200 resize-none"
                        rows={4}
                        placeholder="Mensaje"
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        required
                      />
                    </div>
                    {contactError && <p className="text-sm text-[var(--danger)]">{contactError}</p>}
                    <Button type="submit" size="lg">Enviar Mensaje</Button>
                  </form>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--border)] p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--primary-light)] flex items-center justify-center shrink-0">
                    <Mail size={20} className="text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--ink)]">Correo</p>
                    <p className="text-sm text-[var(--ink-tertiary)]">{companyInfo?.email || 'eldice16@gmail.com'}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--border)] p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-[var(--radius-lg)] bg-[var(--accent-light)] flex items-center justify-center shrink-0">
                    <Phone size={20} className="text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--ink)]">Teléfono</p>
                    <p className="text-sm text-[var(--ink-tertiary)]">{companyInfo?.phone || '(000) 000-0000'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter companyInfo={companyInfo} />
    </div>
  )
}
