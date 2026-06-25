import nodemailer from 'nodemailer'
import crypto from 'crypto'

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

function lagTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   ?? 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export async function sendPasswordResetEmail(opts: {
  til: string
  resetUrl: string
}) {
  if (!process.env.SMTP_USER) return

  const transport = lagTransport()
  await transport.sendMail({
    from: `"CuriousTide" <${process.env.SMTP_USER}>`,
    to:   opts.til,
    subject: 'Reset password / Tilbakestill passord – CuriousTide',
    text: [
      `Hi!`,
      ``,
      `Click the link below to reset your password. The link expires in 1 hour.`,
      ``,
      opts.resetUrl,
      ``,
      `If you did not request this, you can ignore this email.`,
      ``,
      `– CuriousTide`,
      ``,
      `---`,
      ``,
      `Hei!`,
      ``,
      `Klikk lenken nedenfor for å tilbakestille passordet ditt. Lenken utløper om 1 time.`,
      ``,
      opts.resetUrl,
      ``,
      `Hvis du ikke ba om dette, kan du ignorere denne e-posten.`,
      ``,
      `– CuriousTide`,
    ].join('\n'),
  })
}

export async function sendPiOnlineEmail(opts: {
  til: string
  ip: string
  port: number
}) {
  if (!process.env.SMTP_USER) return

  const url = `http://${opts.ip}:${opts.port}`
  const transport = lagTransport()
  await transport.sendMail({
    from: `"CuriousTide" <${process.env.SMTP_USER}>`,
    to:   opts.til,
    subject: 'CuriousTide Pi er online 🎙️',
    text: [
      `Hei!`,
      ``,
      `Din CuriousTide-enhet er nå tilkoblet nettverket og klar til bruk.`,
      ``,
      `Åpne innstillingssiden her:`,
      `${url}`,
      ``,
      `– CuriousTide`,
    ].join('\n'),
  })
}

export async function sendTimerStartetEmail(opts: {
  til: string
  kanalNavn: string
  utløper: Date
}) {
  if (!process.env.SMTP_USER) return

  const datoNo = opts.utløper.toLocaleDateString('nb-NO', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const datoEn = opts.utløper.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const transport = lagTransport()
  await transport.sendMail({
    from: `"CuriousTide" <${process.env.SMTP_USER}>`,
    to:   opts.til,
    subject: `Timer started / Timeren har startet – "${opts.kanalNavn}"`,
    text: [
      `Hi!`,
      ``,
      `The timer for channel "${opts.kanalNavn}" has now started.`,
      `The channel is available until: ${datoEn}`,
      ``,
      `– CuriousTide`,
      ``,
      `---`,
      ``,
      `Hei!`,
      ``,
      `Timeren for kanalen «${opts.kanalNavn}» har nå startet.`,
      `Kanalen er tilgjengelig til: ${datoNo}`,
      ``,
      `– CuriousTide`,
    ].join('\n'),
  })
}
