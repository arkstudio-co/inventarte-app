import { useMemo } from 'react'
import { useAuth } from '@/providers/AuthProvider'

const PERMISSIONS: Record<string, string[]> = {
  admin: [
    'view_inventory', 'create_product', 'edit_product', 'delete_product',
    'manage_users', 'manage_landing', 'view_withdrawals',
    'create_withdrawals',
  ],
  operative: [
    'view_inventory', 'create_product', 'edit_product',
    'view_withdrawals', 'create_withdrawals',
  ],
}

export function usePermissions() {
  const { profile } = useAuth()

  const userPermissions = useMemo(() => {
    if (!profile) return []
    return PERMISSIONS[profile.role] ?? []
  }, [profile])

  const hasPermission = (permission: string) => userPermissions.includes(permission)
  const isAdmin = profile?.role === 'admin'

  return { permissions: userPermissions, hasPermission, isAdmin }
}
