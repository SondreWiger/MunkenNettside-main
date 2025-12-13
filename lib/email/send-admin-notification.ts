'use server'

import nodemailer from 'nodemailer'

interface AdminPromotionData {
  userFullName: string
  userEmail: string
  adminUuid: string
  promotedBy?: string
}

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_SERVER,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_LOGIN,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  }
  return transporter
}

export async function sendAdminPromotionEmail(data: AdminPromotionData): Promise<{ success: boolean; error?: string }> {
  console.log('[v0] sendAdminPromotionEmail called with:', data)

  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@teateret.no'
  const fromName = process.env.BREVO_FROM_NAME || 'Teateret'
  const toEmail = process.env.ADMIN_NOTIFY_EMAIL || 'teater@northem.no'

  if (!process.env.SMTP_SERVER || !process.env.SMTP_LOGIN || !process.env.SMTP_PASSWORD) {
    console.error('[v0] ERROR: SMTP credentials not configured!')
    return { success: false, error: 'E-post er ikke konfigurert (mangler SMTP credentials)' }
  }

  const html = `
    <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;">
      <h2>Ny administrator opprettet</h2>
      <p>Bruker <strong>${data.userFullName}</strong> &lt;${data.userEmail}&gt; har blitt tildelt administrator-rollen.</p>
      <p>Admin UUID (nødvendig for admin-innlogging / registrering):</p>
      <pre style="background:#f7f7f7;padding:8px;border-radius:4px;display:inline-block">${data.adminUuid}</pre>
      ${data.promotedBy ? `<p>Promotert av: ${data.promotedBy}</p>` : ''}
      <p>Instruksjon: Gi denne UUID-en til brukeren. Når brukeren logger inn som administrator første gang, må de oppgi UUID-en og verifisere seg med en kode sendt på e-post.</p>
    </div>
  `

  try {
    const transporter = getTransporter()
    const info = await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: toEmail,
      subject: `Ny administrator: ${data.userFullName} <${data.userEmail}>`,
      html,
    })

    console.log('[v0] Admin promotion email sent. MessageId:', info.messageId)
    return { success: true }
  } catch (error) {
    console.error('[v0] Failed to send admin promotion email:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
