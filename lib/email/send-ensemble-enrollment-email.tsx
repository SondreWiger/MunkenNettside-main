'use server'

import nodemailer from 'nodemailer'

interface EnrollmentEmailData {
  recipientEmail: string
  recipientName: string
  childName?: string // Name of child if parent is being notified
  ensembleTitle: string
  enrollmentReference: string
  enrollmentStatus: string // 'pending', 'confirmed', 'payment_completed', etc.
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

function getEmailTemplate(
  recipientName: string,
  childName: string | undefined,
  ensembleTitle: string,
  enrollmentStatus: string,
  enrollmentReference: string
): { subject: string; html: string } {
  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@teateret.no'
  const fromName = process.env.BREVO_FROM_NAME || 'Teateret'
  const supportEmail = process.env.SUPPORT_EMAIL || 'kontakt@teateret.no'

  let subject = ''
  let greeting = ''
  let mainContent = ''

  if (enrollmentStatus === 'pending') {
    subject = `Påmelding bekreftet: ${ensembleTitle}`
    greeting = `Hei ${recipientName},`
    if (childName) {
      mainContent = `
        <p style="color: #555; margin-bottom: 20px;">
          Takk for at du meldte på ${childName} til <strong>${ensembleTitle}</strong>!
        </p>
        <p style="color: #555; margin-bottom: 20px;">
          Vi har mottatt påmeldingen og den vil bli vurdert. Du vil motta en e-post når resultatet av audisjonene er klart.
        </p>
      `
    } else {
      mainContent = `
        <p style="color: #555; margin-bottom: 20px;">
          Takk for at du meldte deg på <strong>${ensembleTitle}</strong>!
        </p>
        <p style="color: #555; margin-bottom: 20px;">
          Vi har mottatt din påmelding og den vil bli vurdert. Du vil motta en e-post når resultatet av audisjonene er klart.
        </p>
      `
    }
  } else if (enrollmentStatus === 'confirmed') {
    subject = `Gratulerer! Du er akseptert til ${ensembleTitle}`
    greeting = `Hei ${recipientName},`
    if (childName) {
      mainContent = `
        <p style="color: #555; margin-bottom: 20px;">
          <strong>Gratulerer!</strong> ${childName} er akseptert til <strong>${ensembleTitle}</strong>! 🎉
        </p>
        <p style="color: #555; margin-bottom: 20px;">
          Vi er glad for at ${childName} skal være med oss. Neste steg er å betale medlemskapet som gir tilgang til alle øktene.
        </p>
        <p style="color: #555; margin-bottom: 20px;">
          Vennligst logg inn på din konto og fullfør betalingen for å sikre plassen.
        </p>
      `
    } else {
      mainContent = `
        <p style="color: #555; margin-bottom: 20px;">
          <strong>Gratulerer!</strong> Du er akseptert til <strong>${ensembleTitle}</strong>! 🎉
        </p>
        <p style="color: #555; margin-bottom: 20px;">
          Vi er glad for at du skal være med oss. Neste steg er å betale medlemskapet som gir tilgang til alle øktene.
        </p>
        <p style="color: #555; margin-bottom: 20px;">
          Vennligst logg inn på din konto og fullfør betalingen for å sikre plassen.
        </p>
      `
    }
  } else if (enrollmentStatus === 'payment_completed') {
    subject = `Betaling mottatt: ${ensembleTitle}`
    greeting = `Hei ${recipientName},`
    if (childName) {
      mainContent = `
        <p style="color: #555; margin-bottom: 20px;">
          Takk! Vi har mottatt betalingen for ${childName}s medlemskap til <strong>${ensembleTitle}</strong>.
        </p>
        <p style="color: #555; margin-bottom: 20px;">
          Plassen er nå sikret og ${childName} kan begynne på første økt. Du vil motta praktisk informasjon om øktene snart.
        </p>
      `
    } else {
      mainContent = `
        <p style="color: #555; margin-bottom: 20px;">
          Takk! Vi har mottatt betalingen for ditt medlemskap til <strong>${ensembleTitle}</strong>.
        </p>
        <p style="color: #555; margin-bottom: 20px;">
          Plassen din er nå sikret og du kan begynne på første økt. Du vil motta praktisk informasjon om øktene snart.
        </p>
      `
    }
  } else {
    subject = `Påmelding til ${ensembleTitle}`
    greeting = `Hei ${recipientName},`
    mainContent = `<p style="color: #555; margin-bottom: 20px;">Takk for din påmelding!</p>`
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; margin: 0; padding: 0;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎭 ${ensembleTitle}</h1>
        </div>
        
        <div style="max-width: 600px; margin: 20px auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <p style="color: #333; margin-bottom: 20px;">${greeting}</p>
          
          ${mainContent}
          
          <!-- Reference Number -->
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #666; margin: 0; font-size: 12px;">Referansenummer</p>
            <p style="color: #333; margin: 5px 0 0 0; font-size: 18px; font-weight: bold; font-family: 'Courier New', monospace;">
              ${enrollmentReference}
            </p>
          </div>
          
          <p style="color: #555; margin-top: 30px; margin-bottom: 10px; border-top: 1px solid #e0e0e0; padding-top: 20px;">
            Har du spørsmål? Kontakt oss på <a href="mailto:${supportEmail}" style="color: #667eea; text-decoration: none;">${supportEmail}</a>
          </p>
          
          <p style="color: #999; font-size: 12px; margin-top: 20px;">
            © 2024 ${fromName}. Alle rettigheter forbeholdt.
          </p>
        </div>
      </body>
    </html>
  `

  return { subject, html }
}

export async function sendEnrollmentEmail(data: EnrollmentEmailData): Promise<{ success: boolean; error?: string }> {
  console.log('[ensemble-email] ========== ENROLLMENT EMAIL SEND START ==========')
  console.log('[ensemble-email] sendEnrollmentEmail called with:', {
    recipientEmail: data.recipientEmail,
    recipientName: data.recipientName,
    childName: data.childName,
    ensembleTitle: data.ensembleTitle,
    enrollmentStatus: data.enrollmentStatus,
  })

  const fromEmail = process.env.BREVO_FROM_EMAIL || 'noreply@teateret.no'
  const fromName = process.env.BREVO_FROM_NAME || 'Teateret'

  if (!process.env.SMTP_SERVER || !process.env.SMTP_LOGIN || !process.env.SMTP_PASSWORD) {
    console.error('[ensemble-email] ERROR: SMTP credentials not configured!')
    return { success: false, error: 'E-post er ikke konfigurert (mangler SMTP credentials)' }
  }

  try {
    const { subject, html } = getEmailTemplate(
      data.recipientName,
      data.childName,
      data.ensembleTitle,
      data.enrollmentStatus,
      data.enrollmentReference
    )

    const mailOptions = {
      from: `${fromName} <${fromEmail}>`,
      to: data.recipientEmail,
      subject: subject,
      html: html,
    }

    console.log('[ensemble-email] Sending email to:', data.recipientEmail)
    const transporter = getTransporter()
    const info = await transporter.sendMail(mailOptions)

    console.log('[ensemble-email] Email sent successfully:', info.messageId)
    console.log('[ensemble-email] ========== ENROLLMENT EMAIL SEND SUCCESS ==========')

    return { success: true }
  } catch (error) {
    console.error('[ensemble-email] Email sending failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ukjent feil ved sending av e-post',
    }
  }
}

export async function sendEnrollmentConfirmationToBothParentAndChild(
  parentEmail: string,
  parentName: string,
  childEmail: string,
  childName: string,
  ensembleTitle: string,
  enrollmentReference: string,
  enrollmentStatus: string
): Promise<{ parentSuccess: boolean; childSuccess: boolean; errors: string[] }> {
  const errors: string[] = []

  // Send to parent
  const parentResult = await sendEnrollmentEmail({
    recipientEmail: parentEmail,
    recipientName: parentName,
    childName: childName,
    ensembleTitle: ensembleTitle,
    enrollmentReference: enrollmentReference,
    enrollmentStatus: enrollmentStatus,
  })

  if (!parentResult.success) {
    errors.push(`Feil ved sending til forelder: ${parentResult.error}`)
  }

  // Send to child
  const childResult = await sendEnrollmentEmail({
    recipientEmail: childEmail,
    recipientName: childName,
    ensembleTitle: ensembleTitle,
    enrollmentReference: enrollmentReference,
    enrollmentStatus: enrollmentStatus,
  })

  if (!childResult.success) {
    errors.push(`Feil ved sending til barn: ${childResult.error}`)
  }

  return {
    parentSuccess: parentResult.success,
    childSuccess: childResult.success,
    errors: errors,
  }
}
