'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { resetPasswordSchema } from '@/lib/validations/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsValidSession(!!session)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const result = resetPasswordSchema.safeParse({ password, confirmPassword })
    if (!result.success) {
      setError(result.error.issues[0].message)
      return
    }

    setIsLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setIsLoading(false)
      return
    }

    router.push('/wallet')
  }

  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-0)]">
        <p className="text-sm text-[var(--ink-tertiary)]">Cargando...</p>
      </div>
    )
  }

  if (!isValidSession) {
    return (
      <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-6">
        <div className="space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-[var(--ink)]">Enlace inválido</h1>
            <p className="text-sm text-[var(--ink-tertiary)]">
              Este enlace de recuperación ha expirado o no es válido. Solicita uno nuevo.
            </p>
          </div>
          <Link href="/forgot-password">
            <Button variant="secondary">Solicitar nuevo enlace</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-6">
      <div className="space-y-6">
        <div className="text-center space-y-2">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Nueva Contraseña</h1>
        <p className="text-sm text-[var(--ink-tertiary)]">
          Ingresa tu nueva contraseña.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="password"
          label="Nueva contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••"
          required
        />
        <Input
          id="confirmPassword"
          label="Confirmar contraseña"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••"
          required
        />

        {error && (
          <div className="text-sm text-[var(--danger)] bg-[var(--danger-light)] px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--danger)]/20">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Actualizando...' : 'Actualizar contraseña'}
        </Button>
      </form>
    </div>
    </div>
  )
}
