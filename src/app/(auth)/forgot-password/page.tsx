'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { forgotPasswordSchema } from '@/lib/validations/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = forgotPasswordSchema.safeParse({ email })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    setIsLoading(true)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    sessionStorage.setItem('auth_next', '/reset-password')
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/callback`,
    })

    if (authError) {
      setError(authError.message)
      setIsLoading(false)
      return
    }

    setSent(true)
    setIsLoading(false)
  }

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-[var(--ink)]">Revisa tu correo</h1>
          <p className="text-sm text-[var(--ink-tertiary)]">
            Si existe una cuenta con ese correo, recibirás un enlace de recuperación.
          </p>
        </div>
        <Link href="/">
          <Button variant="secondary">Volver al inicio</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Recuperar Contraseña</h1>
        <p className="text-sm text-[var(--ink-tertiary)]">
          Ingresa tu correo y te enviaremos un enlace de recuperación.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="email"
          label="Correo electrónico"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          required
        />

        {error && (
          <div className="text-sm text-[var(--danger)] bg-[var(--danger-light)] px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--danger)]/20">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Enviando...' : 'Enviar enlace'}
        </Button>
      </form>

      <div className="text-center">
        <Link
          href="/"
          className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-2"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
