import { z } from 'zod'

export const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  stock: z.coerce.number().int().min(0, 'El stock no puede ser negativo').or(z.literal('')),
  min_stock: z.coerce.number().int().min(0, 'El stock mínimo no puede ser negativo').or(z.literal('')),
  price: z.coerce.number().min(0, 'El precio no puede ser negativo').or(z.literal('')),
  cost: z.coerce.number().min(0, 'El costo no puede ser negativo').or(z.literal('')),
  gramaje: z.coerce.number().min(0, 'El gramaje no puede ser negativo').optional().or(z.literal('')),
  supplier_id: z.string().uuid().optional().or(z.literal('')),
  image_url: z.string().optional(),
})

export type ProductFormData = z.infer<typeof productSchema>
