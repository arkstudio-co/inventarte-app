import { z } from 'zod'

export const withdrawalSchema = z.object({
  product_id: z.string().uuid('Producto requerido'),
  quantity: z.coerce.number().int().min(1, 'La cantidad debe ser al menos 1'),
  person_name: z.string().min(1, 'El nombre es requerido'),
  person_email: z.string().email('Correo electrónico inválido'),
  delivery_type: z.enum(['paid', 'pending']),
  pending_amount: z.coerce.number().optional(),
  observations: z.string().optional(),
})

export type WithdrawalFormData = z.infer<typeof withdrawalSchema>
