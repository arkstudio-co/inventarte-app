import { Resend } from 'resend'

const FROM_EMAIL = 'Dibujarte <onboarding@resend.dev>'

let resendInstance: Resend | null = null

function getResend() {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured')
    }
    resendInstance = new Resend(apiKey)
  }
  return resendInstance
}

export async function sendWithdrawalEmail({
  to,
  productName,
  quantity,
  pendingAmount,
  observations,
}: {
  to: string
  productName: string
  quantity: number
  pendingAmount?: number | null
  observations?: string | null
}) {
  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Retiro de Stock - Dibujarte',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h1 style="color:#1A1A1A;">Retiro de Stock Confirmado</h1>
        <p>Se ha realizado un retiro de stock con los siguientes detalles:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:8px;border-bottom:1px solid #e0d8cc;"><strong>Producto:</strong></td><td style="padding:8px;border-bottom:1px solid #e0d8cc;">${productName}</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #e0d8cc;"><strong>Cantidad:</strong></td><td style="padding:8px;border-bottom:1px solid #e0d8cc;">${quantity}</td></tr>
          ${pendingAmount ? `<tr><td style="padding:8px;border-bottom:1px solid #e0d8cc;"><strong>Valor Pendiente:</strong></td><td style="padding:8px;border-bottom:1px solid #e0d8cc;">$${pendingAmount.toLocaleString()}</td></tr>` : ''}
          ${observations ? `<tr><td style="padding:8px;border-bottom:1px solid #e0d8cc;"><strong>Observaciones:</strong></td><td style="padding:8px;border-bottom:1px solid #e0d8cc;">${observations}</td></tr>` : ''}
        </table>
        <p style="color:#666;">Gracias por confiar en Dibujarte.</p>
      </div>
    `,
  })
}

export async function sendRemisionEmail({
  to,
  remision,
}: {
  to: string
  remision: any
}) {
  const items = remision.remision_items || []
  const itemsHtml = items.map((item: any, i: number) => `
    <tr${i % 2 === 0 ? ' style="background:#f9f7f5;"' : ''}>
      <td style="padding:10px 12px;border-bottom:1px solid #e0d8cc;font-size:14px;">${item.product_name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e0d8cc;font-size:14px;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e0d8cc;font-size:14px;text-align:right;">$${Number(item.unit_price).toLocaleString('es-CO')}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e0d8cc;font-size:14px;text-align:right;">$${Number(item.subtotal).toLocaleString('es-CO')}</td>
    </tr>
  `).join('')

  const deliveryLabel = remision.delivery_type === 'paid' ? 'Producto pagado' : 'Producto por pagar'

  return getResend().emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Remisión ${remision.remision_number} - Dibujarte`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1A1A1A;">
        <div style="background:#1A5F7A;padding:24px;border-radius:8px 8px 0 0;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:20px;">Dibujarte Editores</h1>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e0d8cc;border-top:0;border-radius:0 0 8px 8px;">
          <p style="font-size:16px;margin:0 0 4px 0;">Hola <strong>${remision.person_name}</strong>,</p>
          <p style="color:#666;margin:0 0 20px 0;">Se ha generado una nueva remisión con los siguientes detalles:</p>

          <table style="width:100%;border-collapse:collapse;margin:0 0 16px 0;">
            <tr><td style="padding:6px 0;font-size:14px;color:#666;">Número:</td><td style="padding:6px 0;font-size:14px;font-weight:600;">${remision.remision_number}</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#666;">Tipo de entrega:</td><td style="padding:6px 0;font-size:14px;">${deliveryLabel}</td></tr>
            <tr><td style="padding:6px 0;font-size:14px;color:#666;">Fecha:</td><td style="padding:6px 0;font-size:14px;">${new Date(remision.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
          </table>

          <h3 style="font-size:14px;color:#1A5F7A;margin:0 0 8px 0;text-transform:uppercase;">Productos</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#1A5F7A;color:#fff;">
                <th style="padding:10px 12px;text-align:left;font-size:13px;">Producto</th>
                <th style="padding:10px 12px;text-align:center;font-size:13px;">Cant.</th>
                <th style="padding:10px 12px;text-align:right;font-size:13px;">Precio</th>
                <th style="padding:10px 12px;text-align:right;font-size:13px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding:12px;text-align:right;font-weight:600;font-size:15px;border-top:2px solid #1A5F7A;">Total</td>
                <td style="padding:12px;text-align:right;font-weight:600;font-size:15px;border-top:2px solid #1A5F7A;">$${Number(remision.total_amount).toLocaleString('es-CO')}</td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top:24px;padding:16px;background:#f9f7f5;border-radius:6px;font-size:13px;color:#666;text-align:center;">
            Gracias por confiar en Dibujarte Editores.
          </div>
        </div>
      </div>
    `,
  })
}

export async function sendPasswordReset(email: string, resetLink: string) {
  return getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: 'Recuperación de Contraseña - Dibujarte',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h1 style="color:#1A1A1A;">Recuperación de Contraseña</h1>
        <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace:</p>
        <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#1A1A1A;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0;">Restablecer Contraseña</a>
        <p style="color:#666;">Si no solicitaste esto, ignora este correo.</p>
      </div>
    `,
  })
}
