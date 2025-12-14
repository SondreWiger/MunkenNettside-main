'use server'

import nodemailer from 'nodemailer'

interface NewsletterData {
  email: string
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

export async function sendNewsletterSubscription(data: NewsletterData): Promise<{ success: boolean; error?: string }> {
  if (!process.env.SMTP_SERVER || !process.env.SMTP_LOGIN || !process.env.SMTP_PASSWORD) {
    console.error('[v0] ERROR: SMTP credentials not configured!')
    return { success: false, error: 'E-post er ikke konfigurert' }
  }

  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@teateret.no'
  const fromName = process.env.BREVO_FROM_NAME || 'Teateret'
  const notifyTo = process.env.NEWSLETTER_NOTIFY_EMAIL || 'kontakt@teateret.no'

  try {
    const transporter = getTransporter()

    // Notify admin
    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: notifyTo,
      subject: `Ny påmelding til nyhetsbrev: ${data.email}`,
      html: `<p>Ny e-postadresse har meldt seg på nyhetsbrevet: <strong>${data.email}</strong></p>`,
    })

    // Confirmation to subscriber (simple)
    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: data.email,
      subject: `Takk for at du melder deg på nyhetsbrevet!`,
      html: `<p>Takk for at du meldte deg på Teaterets nyhetsbrev. Vi sender deg kun viktige oppdateringer og tilbud.</p>`,
    })

    return { success: true }
  } catch (error) {
    console.error('[v0] Failed to process newsletter subscription:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
