import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/types/database'

export function useNotifications() {
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const supabase = createClient()

  const checkLowStock = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)

    if (data) {
      const filtered = data.filter((p: Product) => p.stock <= p.min_stock)
      setLowStockProducts(filtered)
      setUnreadCount(filtered.length)
    }
  }, [])

  useEffect(() => {
    checkLowStock()
    const interval = setInterval(checkLowStock, 60000)
    return () => clearInterval(interval)
  }, [checkLowStock])

  return { lowStockProducts, unreadCount, refresh: checkLowStock }
}
