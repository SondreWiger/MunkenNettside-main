'use server'

import nodemailer from 'nodemailer'

interface AdminVerificationEmailData {
  toEmail: string
  userFullName?: string
  code: string
  expiresAt: string
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

export async function sendAdminVerificationCode(data: AdminVerificationEmailData): Promise<{ success: boolean; error?: string }> {
  console.log('[v0] sendAdminVerificationCode called for:', data.toEmail)

  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@teateret.no'
  const fromName = process.env.BREVO_FROM_NAME || 'Teateret'

  if (!process.env.SMTP_SERVER || !process.env.SMTP_LOGIN || !process.env.SMTP_PASSWORD) {
    console.error('[v0] ERROR: SMTP credentials not configured!')
    return { success: false, error: 'E-post er ikke konfigurert (mangler SMTP credentials)' }
  }

  const html = `
    <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;">
      <h2>Admin-verifisering</h2>
      <p>Hei ${data.userFullName || ''},</p>
      <p>Din admin-verifiseringskode er:</p>
      <pre style="background:#f7f7f7;padding:8px;border-radius:4px;display:inline-block;font-size:20px;">${data.code}</pre>
      <p>Koden utløper ${new Date(data.expiresAt).toLocaleString('nb-NO')}.</p>
      <p>Hvis du ikke prøvde å logge inn som administrator, ignorer denne meldingen.</p>
    </div>
  `

  try {
    const transporter = getTransporter()
    const info = await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: data.toEmail,
      subject: `Din admin-verifiseringskode`,
      html,
    })

    console.log('[v0] Admin verification email sent. MessageId:', info.messageId)
    return { success: true }
  } catch (error) {
    console.error('[v0] Failed to send admin verification email:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
