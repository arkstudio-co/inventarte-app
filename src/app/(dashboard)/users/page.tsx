'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { useCompany } from '@/providers/CompanyProvider'
import { UserPlus, Pencil, Trash2, Users } from 'lucide-react'
import type { Profile, Permission } from '@/types/database'

const PERMISSION_LIST = [
  { value: 'view_inventory', label: 'Ver inventario' },
  { value: 'create_product', label: 'Crear productos' },
  { value: 'edit_product', label: 'Editar productos' },
  { value: 'delete_product', label: 'Eliminar productos' },
  { value: 'manage_users', label: 'Gestionar usuarios' },

  { value: 'manage_landing', label: 'Gestionar landing' },
  { value: 'view_withdrawals', label: 'Ver retiros' },
  { value: 'create_withdrawals', label: 'Crear retiros' },
]

export default function UsersPage() {
  const supabase = createClient()
  const { companyId } = useCompany()
  const [users, setUsers] = useState<Profile[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [userPermissions, setUserPermissions] = useState<string[]>([])
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'operative' as 'admin' | 'operative' })
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    if (data) setUsers(data)
  }

  const fetchPermissions = async (userId: string) => {
    const { data } = await supabase
      .from('user_permissions')
      .select('permission_id')
      .eq('user_id', userId)
    if (data) setUserPermissions(data.map((p: any) => p.permission_id))
    else setUserPermissions([])
  }

  useEffect(() => { fetchUsers() }, [])

  const openEdit = (user: Profile) => {
    setEditingUser(user)
    setForm({ full_name: user.full_name, email: user.email, password: '', role: user.role })
    fetchPermissions(user.id)
    setShowModal(true)
  }

  const openCreate = () => {
    setEditingUser(null)
    setForm({ full_name: '', email: '', password: '', role: 'operative' })
    setUserPermissions([])
    setShowModal(true)
  }

  const togglePermission = (perm: string) => {
    setUserPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (editingUser) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: form.full_name, role: form.role })
        .eq('id', editingUser.id)

      if (updateError) {
        setError(updateError.message)
        setIsLoading(false)
        return
      }

      await supabase.from('user_permissions').delete().eq('user_id', editingUser.id)
    } else {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: form.email,
        password: form.password,
        email_confirm: true,
      })

      if (authError) {
        setError(authError.message)
        setIsLoading(false)
        return
      }

      if (authData.user) {
        await supabase.from('profiles').insert({
          id: authData.user.id,
          full_name: form.full_name,
          email: form.email,
          role: form.role,
          company_id: companyId,
        })
      }
    }

    const targetUserId = editingUser?.id
    if (targetUserId && userPermissions.length > 0) {
      await supabase.from('user_permissions').insert(
        userPermissions.map((perm) => ({
          user_id: targetUserId,
          permission_id: perm,
        }))
      )
    }

    setIsLoading(false)
    setShowModal(false)
    fetchUsers()
  }

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`¿Eliminar a ${userName}?`)) return
    await supabase.from('user_permissions').delete().eq('user_id', userId)
    await supabase.from('profiles').delete().eq('id', userId)
    await supabase.auth.admin.deleteUser(userId)
    fetchUsers()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Usuarios</h1>
        <Button onClick={openCreate}>
          <UserPlus size={16} /> Crear Usuario
        </Button>
      </div>

      <div className="space-y-3">
        {users.length === 0 ? (
          <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-8 text-center">
            <Users size={40} className="mx-auto mb-3 text-[var(--ink-muted)]" />
            <p className="text-sm text-[var(--ink-tertiary)]">No hay usuarios registrados</p>
          </div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--tint-light)] flex items-center justify-center text-sm font-medium text-[var(--tint)]">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">{user.full_name}</p>
                  <p className="text-xs text-[var(--ink-tertiary)]">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={user.role === 'admin' ? 'default' : 'success'}>
                  {user.role === 'admin' ? 'Admin' : 'Operativo'}
                </Badge>
                <button onClick={() => openEdit(user)} className="p-2 text-[var(--ink-tertiary)] hover:text-[var(--tint)] hover:bg-[var(--tint-light)] rounded-[var(--radius-sm)] transition-colors cursor-pointer">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(user.id, user.full_name)} className="p-2 text-[var(--ink-tertiary)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] rounded-[var(--radius-sm)] transition-colors cursor-pointer">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? 'Editar Usuario' : 'Crear Usuario'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="full_name"
            label="Nombre completo"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />
          <Input
            id="email"
            label="Correo electrónico"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={!!editingUser}
            required
          />
          {!editingUser && (
            <Input
              id="password"
              label="Contraseña"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          )}
          <Select
            id="role"
            label="Rol"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'operative' })}
            options={[
              { value: 'admin', label: 'Administrador' },
              { value: 'operative', label: 'Operativo' },
            ]}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Permisos</label>
            <div className="grid grid-cols-2 gap-2">
              {PERMISSION_LIST.map((perm) => (
                <label
                  key={perm.value}
                  className="flex items-center gap-2 px-3 py-2 text-sm rounded-[var(--radius-sm)] border border-[var(--border-default)] cursor-pointer hover:bg-[var(--surface-0)] transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={userPermissions.includes(perm.value)}
                    onChange={() => togglePermission(perm.value)}
                    className="accent-[var(--tint)]"
                  />
                  {perm.label}
                </label>
              ))}
            </div>
          </div>

          {error && <div className="text-sm text-[var(--danger)] bg-[var(--danger-light)] px-3 py-2 rounded-[var(--radius-sm)]">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardando...' : editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
