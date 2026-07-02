'use client'

import { Suspense, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const handled = useRef(false)

  useEffect(() => {
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
      ;(async () => {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        handled.current = true
        if (!error) {
          router.push(next)
        } else {
          router.push('/')
        }
      })()
      return
    }

    async function handleCallback() {
      const hash = window.location.hash.substring(1)

      if (hash) {
        const hashParams = new URLSearchParams(hash)
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!error) {
            handled.current = true
            window.location.hash = ''
            router.push(next)
            return
          }
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        handled.current = true
        router.push(next)
      } else {
        handled.current = true
        router.push('/')
      }
    }

    handleCallback()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-0)]">
      <p className="text-sm text-[var(--ink-tertiary)]">Verificando sesión...</p>
    </div>
  )
}

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  )
}
