import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Product, AccountPayable } from '@/types/database'

export function useNotifications() {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [dueDebts, setDueDebts] = useState<AccountPayable[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  const checkNotifications = useCallback(async () => {
    let total = 0

    const { data: products } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)

    if (products) {
      const filtered = products.filter((p: Product) => p.stock <= p.min_stock)
      setLowStockProducts(filtered)
      total += filtered.length
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    nextWeek.setHours(23, 59, 59, 999)

    const { data: debts } = await supabase
      .from('accounts_payable')
      .select('*, suppliers(*)')
      .eq('is_paid', false)
      .gte('due_date', today.toISOString())
      .lte('due_date', nextWeek.toISOString())

    if (debts) {
      setDueDebts(debts as AccountPayable[])
      total += debts.length
    }

    setUnreadCount(total)
  }, [])

  useEffect(() => {
    checkNotifications()
    const interval = setInterval(checkNotifications, 60000)
    return () => clearInterval(interval)
  }, [checkNotifications])

  return { lowStockProducts, dueDebts, unreadCount, refresh: checkNotifications }
}
