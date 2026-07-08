import { z } from 'zod'

export const withdrawalSchema = z.object({
  product_id: z.string().uuid('Producto requerido'),
  quantity: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1'),
  reason: z.string().min(1, 'Selecciona un motivo'),
  supplier_id: z.string().uuid().optional(),
  observations: z.string().optional(),
})

export type WithdrawalFormData = z.infer<typeof withdrawalSchema>
