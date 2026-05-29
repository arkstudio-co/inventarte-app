import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Product } from '@/types/database'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('*, suppliers(*)')
      .order('created_at', { ascending: false })
    if (data) setProducts(data)
    setIsLoading(false)
  }, [])

  useEffect(() => { fetchProducts() }, [fetchProducts])

  return { products, isLoading, refetch: fetchProducts }
}
