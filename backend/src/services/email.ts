import nodemailer from 'nodemailer'

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

export async function sendTimerStartetEmail(opts: {
  til: string
  kanalNavn: string
  utløper: Date
}) {
  if (!process.env.SMTP_USER) return   // ingen e-postkonfig – hopp over

  const dato = opts.utløper.toLocaleDateString('nb-NO', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const transport = lagTransport()
  await transport.sendMail({
    from: `"CuriousTide" <${process.env.SMTP_USER}>`,
    to:   opts.til,
    subject: `Timeren har startet – kanal «${opts.kanalNavn}»`,
    text: [
      `Hei!`,
      ``,
      `Timeren for kanalen «${opts.kanalNavn}» har nå startet.`,
      `Kanalen er tilgjengelig til: ${dato}`,
      ``,
      `– CuriousTide`,
    ].join('\n'),
  })
}
