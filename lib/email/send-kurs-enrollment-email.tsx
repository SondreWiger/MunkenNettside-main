'use server'

import nodemailer from 'nodemailer'

interface KursEnrollmentEmailData {
  recipientEmail: string
  recipientName: string
  kursTitle: string
  kursId: string
  enrollmentReference: string
  amountPaid: number
  confirmedAt: string
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

export async function sendKursEnrollmentEmail(data: KursEnrollmentEmailData): Promise<{ success: boolean; error?: string }> {
  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@teateret.no'
  const fromName = process.env.BREVO_FROM_NAME || 'Teateret'
  const supportEmail = process.env.SUPPORT_EMAIL || 'kontakt@teateret.no'
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://teateret.no'

  const kursUrl = `${baseUrl}/kurs/${data.kursId}`
  const formattedDate = new Date(data.confirmedAt).toLocaleString('no-NO', {
    dateStyle: 'long',
    timeStyle: 'short'
  })

  const subject = `Bekreftelse: Påmelding til ${data.kursTitle}`
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Velkommen til ${data.kursTitle}! 🎉</h2>
          <p>Hei ${data.recipientName},</p>
          <p><strong>Gratulerer!</strong> Din påmelding til <strong>${data.kursTitle}</strong> er nå bekreftet.</p>
          
          <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Påmeldingsdetaljer:</strong></p>
            <p style="margin: 5px 0;">📝 Referansenummer: <strong>${data.enrollmentReference}</strong></p>
            <p style="margin: 5px 0;">💰 Beløp betalt: <strong>${data.amountPaid.toLocaleString('no-NO')} NOK</strong></p>
            <p style="margin: 5px 0;">📅 Bekreftet: ${formattedDate}</p>
          </div>

          <p>Du kan se all informasjon om kurset, datoer, og øvelsestider her:</p>
          <p style="margin: 30px 0;">
            <a href="${kursUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Se kurset mitt
            </a>
          </p>

          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>Viktig:</strong> Husk å møte opp til første økt! Hvis du har spørsmål eller ikke kan møte, 
              ta kontakt med oss så raskt som mulig.
            </p>
          </div>

          <p>Vi gleder oss til å se deg! 🎭</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #666;">
            Dette er en automatisk bekreftelse. Vennligst ta vare på denne e-posten som kvittering.<br>
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

    console.log(`Kurs enrollment confirmation email sent to ${data.recipientEmail} for ${data.kursTitle}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error sending kurs enrollment email:', error)
    return { success: false, error: error.message }
  }
}
