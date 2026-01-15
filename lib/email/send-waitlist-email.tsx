'use server'

import nodemailer from 'nodemailer'

interface WaitlistEmailData {
  recipientEmail: string
  recipientName: string
  entityType: 'ensemble' | 'kurs'
  entityTitle: string
  entityId: string
  action: 'promoted_auto' | 'promoted_offer' | 'accepted' | 'removed'
  offerExpiresAt?: string
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

export async function sendWaitlistEmail(data: WaitlistEmailData): Promise<{ success: boolean; error?: string }> {
  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@teateret.no'
  const fromName = process.env.BREVO_FROM_NAME || 'Teateret'
  const supportEmail = process.env.SUPPORT_EMAIL || 'kontakt@teateret.no'
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://teateret.no'

  let subject = ''
  let htmlContent = ''

  const entityLabel = data.entityType === 'ensemble' ? 'ensemblet' : 'kurset'
  const entityUrl = data.entityType === 'ensemble' 
    ? `${baseUrl}/ensemble/${data.entityId}` 
    : `${baseUrl}/kurs/${data.entityId}`

  if (data.action === 'promoted_auto') {
    subject = `God nyhet! Du er nå medlem av ${data.entityTitle}`
    htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">God nyhet fra Teateret! 🎉</h2>
            <p>Hei ${data.recipientName},</p>
            <p><strong>Du er nå automatisk akseptert til ${data.entityTitle}!</strong></p>
            <p>En plass har blitt ledig, og siden du stod på ventelisten har vi automatisk meldt deg på.</p>
            <p>Du kan se all informasjon og dine økter/forestillinger her:</p>
            <p style="margin: 30px 0;">
              <a href="${entityUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Se ${entityLabel}
              </a>
            </p>
            <p>Velkommen til ${data.entityTitle}!</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
              Hvis du har spørsmål, kontakt oss på <a href="mailto:${supportEmail}">${supportEmail}</a>
            </p>
          </div>
        </body>
      </html>
    `
  } else if (data.action === 'promoted_offer') {
    const expiresDate = data.offerExpiresAt ? new Date(data.offerExpiresAt).toLocaleString('no-NO', {
      dateStyle: 'long',
      timeStyle: 'short'
    }) : '48 timer'
    
    subject = `Plass tilgjengelig: ${data.entityTitle} - Aksepter innen ${expiresDate}`
    htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">En plass har blitt ledig! 🎭</h2>
            <p>Hei ${data.recipientName},</p>
            <p><strong>God nyhet!</strong> En plass har blitt ledig i ${data.entityTitle}.</p>
            <p>Du stod på ventelisten, og vi tilbyr deg nå en plass.</p>
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;">
                <strong>Viktig:</strong> Du må akseptere plassen innen <strong>${expiresDate}</strong>. 
                Hvis du ikke aksepterer innen fristen, går plassen videre til neste person på ventelisten.
              </p>
            </div>
            <p style="margin: 30px 0;">
              <a href="${entityUrl}" style="background-color: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-size: 16px;">
                Aksepter plassen min
              </a>
            </p>
            <p>Vi håper du vil være med!</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
              Hvis du har spørsmål, kontakt oss på <a href="mailto:${supportEmail}">${supportEmail}</a>
            </p>
          </div>
        </body>
      </html>
    `
  } else if (data.action === 'accepted') {
    subject = `Velkommen til ${data.entityTitle}!`
    htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">Velkommen! 🎉</h2>
            <p>Hei ${data.recipientName},</p>
            <p>Du har akseptert plassen din i <strong>${data.entityTitle}</strong>!</p>
            <p>Vi gleder oss til å se deg.</p>
            <p style="margin: 30px 0;">
              <a href="${entityUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Se ${entityLabel}
              </a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
              Hvis du har spørsmål, kontakt oss på <a href="mailto:${supportEmail}">${supportEmail}</a>
            </p>
          </div>
        </body>
      </html>
    `
  } else if (data.action === 'removed') {
    subject = `Venteliste: ${data.entityTitle}`
    htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #64748b;">Venteliste oppdatering</h2>
            <p>Hei ${data.recipientName},</p>
            <p>Du har blitt fjernet fra ventelisten for <strong>${data.entityTitle}</strong>.</p>
            <p>Dette kan skyldes at tilbudet om plass utløp, eller at du selv valgte å fjerne deg fra ventelisten.</p>
            <p>Hvis dette var en feil, eller hvis du vil melde deg på ventelisten igjen, kan du gjøre det her:</p>
            <p style="margin: 30px 0;">
              <a href="${entityUrl}" style="background-color: #64748b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Se ${entityLabel}
              </a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            <p style="font-size: 12px; color: #666;">
              Hvis du har spørsmål, kontakt oss på <a href="mailto:${supportEmail}">${supportEmail}</a>
            </p>
          </div>
        </body>
      </html>
    `
  }

  try {
    const transporter = getTransporter()
    
    await transporter.sendMail({
      from: `${fromName} <${fromEmail}>`,
      to: data.recipientEmail,
      subject,
      html: htmlContent,
    })

    console.log(`Waitlist email sent to ${data.recipientEmail} for ${data.entityTitle}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error sending waitlist email:', error)
    return { success: false, error: error.message }
  }
}
