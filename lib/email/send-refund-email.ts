'use server'

import nodemailer from 'nodemailer'

interface RefundEmailData {
  recipientEmail: string
  recipientName: string
  purchaseId: string
  refundAmount: number
  reason: string
  processor: string
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

export async function sendRefundEmail(data: RefundEmailData): Promise<{ success: boolean; error?: string }> {
  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@teateret.no'
  const fromName = process.env.BREVO_FROM_NAME || 'Teateret'
  const supportEmail = process.env.SUPPORT_EMAIL || 'kontakt@teateret.no'

  const processorName = data.processor === 'paypal' ? 'PayPal' : 
                        data.processor === 'vipps' ? 'Vipps' : 
                        data.processor

  const subject = `Refusjon bekreftet - ${data.refundAmount} NOK`
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Refusjon bekreftet</h2>
          <p>Hei ${data.recipientName},</p>
          <p>Din refusjon har blitt behandlet og godkjent.</p>
          
          <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Refusjonsdetaljer:</strong></p>
            <p style="margin: 5px 0;">💰 Beløp: <strong>${data.refundAmount.toLocaleString('no-NO')} NOK</strong></p>
            <p style="margin: 5px 0;">📝 Kjøps-ID: ${data.purchaseId}</p>
            <p style="margin: 5px 0;">💳 Betalingsmetode: ${processorName}</p>
            ${data.reason ? `<p style="margin: 5px 0;">📋 Årsak: ${data.reason}</p>` : ''}
          </div>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>Behandlingstid:</strong> Refusjonen vil bli behandlet og tilbakeført til din ${processorName}-konto 
              innen 5-10 virkedager, avhengig av din bank.
            </p>
          </div>

          <p>Du vil se refusjonen som en kreditering på din kontoutskrift fra ${processorName}.</p>

          <p>Vi beklager eventuelle ulemper dette har medført.</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            Dette er en automatisk bekreftelse på refusjon.<br>
            Hvis du har spørsmål, kontakt oss på <a href="mailto:${supportEmail}">${supportEmail}</a>
          </p>
        </div>
      </body>
    </html>
  `

  try {
    const transporter = getTransporter()
    
    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: data.recipientEmail,
      subject,
      html: htmlContent,
    })

    console.log(`Refund confirmation email sent to ${data.recipientEmail}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error sending refund email:', error)
    return { success: false, error: error.message }
  }
}
