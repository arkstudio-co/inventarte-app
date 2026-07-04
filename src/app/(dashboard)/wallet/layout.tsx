'use client'

import { WalletProvider, useWallet } from './wallet-context'
import { DateFilter } from '@/components/ui/DateFilter'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import {
  TrendingUp,
  User,
  Building2,
  Package,
  Plus,
} from 'lucide-react'
import type { ReactNode } from 'react'

function WalletShell({ children }: { children: ReactNode }) {
  const {
    filter, setFilter,
    incomeTotals, paymentsTotal, otherIncomeTotals,
    netArTotals, gastosTotal, balance,
    inventoryValue,
    formatCurrency,
    suppliers,
    apForm, setApForm, apModalOpen, setApModalOpen, handleCreateAp,
    adminForm, setAdminForm, adminModalOpen, setAdminModalOpen, handleCreateAdmin,
    otherIncomeForm, setOtherIncomeForm, otherIncomeModalOpen, setOtherIncomeModalOpen, handleCreateOtherIncome,
  } = useWallet()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-[var(--ink)]">Wallet</h1>
        <DateFilter value={filter} onChange={setFilter} />
      </div>

      {/* Balance hero + summary */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-[var(--ink-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1">
              <TrendingUp size={14} className="text-[var(--success)]" /> Ingresos
            </p>
            <p className="text-lg font-bold text-[var(--success)]">{formatCurrency(incomeTotals + paymentsTotal + otherIncomeTotals)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--ink-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1">
              <User size={14} className="text-[var(--accent)]" /> Por Cobrar
            </p>
            <p className="text-lg font-bold text-[var(--accent)]">{formatCurrency(netArTotals)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--ink-tertiary)] uppercase tracking-wide flex items-center gap-1 mb-1">
              <Building2 size={14} className="text-[var(--warning)]" /> Gastos
            </p>
            <p className="text-lg font-bold text-[var(--warning)]">{formatCurrency(gastosTotal)}</p>
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] bg-[var(--primary-light)] border border-[var(--primary-light)] p-5 flex flex-col justify-center items-center text-center">
          <p className="text-xs font-medium text-[var(--ink)]/70 uppercase tracking-wide mb-1">Saldo Disponible</p>
          <p className="text-3xl font-bold text-[var(--ink)]">{formatCurrency(balance)}</p>
        </div>
      </div>

      {/* Valor del Inventario */}
      <div className="rounded-[var(--radius-md)] bg-[var(--surface-1)] border border-[var(--border-default)] p-4">
        <div className="flex items-center gap-2 mb-1">
          <Package size={18} className="text-[var(--ink-tertiary)]" />
          <h3 className="text-sm font-semibold text-[var(--ink)]">Valor del Inventario</h3>
        </div>
        <p className="text-2xl font-bold text-[var(--ink)]">{formatCurrency(inventoryValue)}</p>
        <p className="text-xs text-[var(--ink-tertiary)] mt-0.5">Suma total de precio × stock de todos los productos</p>
      </div>

      {children}

      {/* Modal: Add AP */}
      <Modal isOpen={apModalOpen} onClose={() => setApModalOpen(false)} title="Agregar Gasto">
        <form onSubmit={handleCreateAp} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Proveedor</label>
            <select
              value={apForm.supplier_id}
              onChange={(e) => setApForm({ ...apForm, supplier_id: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="">Seleccionar proveedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <Input label="Monto" type="number" value={apForm.amount} onChange={(e) => setApForm({ ...apForm, amount: e.target.value === '' ? '' : Number(e.target.value) })} required min={1} />
          <Input label="Descripción" value={apForm.description} onChange={(e) => setApForm({ ...apForm, description: e.target.value })} />
          <Input label="Fecha de vencimiento" type="date" value={apForm.due_date} onChange={(e) => setApForm({ ...apForm, due_date: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setApModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Crear Deuda</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Operational Expense */}
      <Modal isOpen={adminModalOpen} onClose={() => setAdminModalOpen(false)} title="Agregar Gasto Administrativo">
        <form onSubmit={handleCreateAdmin} className="space-y-4">
          <Input label="Descripción" value={adminForm.description} onChange={(e) => setAdminForm({ ...adminForm, description: e.target.value })} required />
          <Input label="Monto" type="number" value={adminForm.amount} onChange={(e) => setAdminForm({ ...adminForm, amount: e.target.value === '' ? '' : Number(e.target.value) })} required min={1} />
          <Input label="Categoría" value={adminForm.category} onChange={(e) => setAdminForm({ ...adminForm, category: e.target.value })} placeholder="ej. Arriendo, Servicios, Papelería" />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Tipo</label>
            <select
              value={adminForm.type}
              onChange={(e) => setAdminForm({ ...adminForm, type: e.target.value as 'fixed' | 'variable' })}
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="variable">Gasto Variable</option>
              <option value="fixed">Gasto Fijo</option>
            </select>
          </div>
          <Input label="Fecha del gasto" type="date" value={adminForm.expense_date} onChange={(e) => setAdminForm({ ...adminForm, expense_date: e.target.value })} />
          <Input label="Notas" value={adminForm.notes} onChange={(e) => setAdminForm({ ...adminForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAdminModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Crear Gasto</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Other Income */}
      <Modal isOpen={otherIncomeModalOpen} onClose={() => setOtherIncomeModalOpen(false)} title="Agregar Otro Ingreso">
        <form onSubmit={handleCreateOtherIncome} className="space-y-4">
          <Input label="Descripción" value={otherIncomeForm.description} onChange={(e) => setOtherIncomeForm({ ...otherIncomeForm, description: e.target.value })} required />
          <Input label="Monto" type="number" value={otherIncomeForm.amount} onChange={(e) => setOtherIncomeForm({ ...otherIncomeForm, amount: e.target.value === '' ? '' : Number(e.target.value) })} required min={1} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--ink-secondary)]">Categoría</label>
            <select
              value={otherIncomeForm.category}
              onChange={(e) => setOtherIncomeForm({ ...otherIncomeForm, category: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-sm)] bg-[var(--surface-0)] text-[var(--ink)] border border-[var(--border-default)] focus:outline-none focus:border-[var(--accent)] transition-colors"
            >
              <option value="">Seleccionar categoría</option>
              <option value="donation">Donación</option>
              <option value="sponsorship">Patrocinio</option>
              <option value="service">Servicio</option>
              <option value="interest">Interés</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <Input label="Fecha del ingreso" type="date" value={otherIncomeForm.income_date} onChange={(e) => setOtherIncomeForm({ ...otherIncomeForm, income_date: e.target.value })} />
          <Input label="Notas" value={otherIncomeForm.notes} onChange={(e) => setOtherIncomeForm({ ...otherIncomeForm, notes: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOtherIncomeModalOpen(false)}>Cancelar</Button>
            <Button type="submit">Crear Ingreso</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default function WalletLayout({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <WalletShell>{children}</WalletShell>
    </WalletProvider>
  )
}
