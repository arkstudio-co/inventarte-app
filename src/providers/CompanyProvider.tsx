'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Company } from '@/types/database'
import { useAuth } from './AuthProvider'

interface CompanyContextValue {
  company: Company | null
  companyId: string | null
  isLoading: boolean
}

const CompanyContext = createContext<CompanyContextValue>({
  company: null,
  companyId: null,
  isLoading: true,
})

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!profile?.company_id) {
      setCompany(null)
      setIsLoading(false)
      return
    }

    supabase
      .from('companies')
      .select('*')
      .eq('id', profile.company_id)
      .single()
      .then(({ data }) => {
        setCompany(data)
        setIsLoading(false)
      })
  }, [profile?.company_id])

  return (
    <CompanyContext.Provider
      value={{
        company,
        companyId: profile?.company_id || null,
        isLoading,
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export const useCompany = () => useContext(CompanyContext)
