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
