'use client'

import { AuthProvider } from './AuthProvider'
import { CompanyProvider } from './CompanyProvider'

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CompanyProvider>
        {children}
      </CompanyProvider>
    </AuthProvider>
  )
}
