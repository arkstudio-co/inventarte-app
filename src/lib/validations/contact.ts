import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Correo electrónico inválido'),
  phone: z.string().optional(),
  message: z.string().min(1, 'El mensaje es requerido'),
})
