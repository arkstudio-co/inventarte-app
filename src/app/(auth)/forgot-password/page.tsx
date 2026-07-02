'use client'

import { useState } from 'react'
import Link from 'next/link'
import { forgotPasswordSchema } from '@/lib/validations/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [recoveryLink, setRecoveryLink] = useState('')
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
    sessionStorage.setItem('auth_next', '/reset-password')

    const res = await fetch('/api/auth/generate-recovery-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
      setIsLoading(false)
      return
    }

    setRecoveryLink(data.url)
    setIsLoading(false)
  }

  if (recoveryLink) {
    return (
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-[var(--ink)]">Enlace de recuperación</h1>
          <p className="text-sm text-[var(--ink-tertiary)]">
            Haz clic en el enlace para restablecer tu contraseña:
          </p>
        </div>
        <a
          href={recoveryLink}
          className="inline-block text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] underline underline-offset-2 break-all"
        >
          {recoveryLink}
        </a>
        <div className="pt-2">
          <Link href="/">
            <Button variant="secondary">Volver al inicio</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Recuperar Contraseña</h1>
        <p className="text-sm text-[var(--ink-tertiary)]">
          Ingresa tu correo para generar un enlace de recuperación.
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
          {isLoading ? 'Generando enlace...' : 'Generar enlace'}
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
