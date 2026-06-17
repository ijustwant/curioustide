import type { FastifyInstance } from 'fastify'
import Stripe from 'stripe'
import { PrismaClient } from '@prisma/client'
import { nanoid } from 'nanoid'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'tommylarsen40@gmail.com')
  .split(',').map((e) => e.trim().toLowerCase())

const PLANER: Record<string, { navn: string; dager: number; øre: number }> = {
  '3dager':  { navn: '3 dager',  dager: 3,  øre: 19900 },
  '14dager': { navn: '14 dager', dager: 14, øre: 34900 },
}

function lagStripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY mangler i .env')
  return new Stripe(key)
}

function leggTilDager(dato: Date, dager: number): Date {
  const ny = new Date(dato)
  ny.setDate(ny.getDate() + dager)
  return ny
}

export default async function paymentRoutes(app: FastifyInstance) {
  const prisma: PrismaClient = (app as any).prisma

  // ── POST /payments/checkout ────────────────────────────────────────────────
  // Oppretter en Stripe Checkout-økt og returnerer URL-en.
  // Admin-brukere omgår betaling og får kanalen opprettet direkte.
  app.post('/checkout', async (request, reply) => {
    const { sub, email } = request.user as { sub: string; email: string }
    const { name, plan } = request.body as { name?: string; plan?: string }

    if (!name?.trim()) return reply.status(400).send({ error: 'Navn mangler' })
    if (!plan || !PLANER[plan]) return reply.status(400).send({ error: 'Ugyldig plan' })

    // Admin-unntak: opprett kanal direkte uten betaling
    if (ADMIN_EMAILS.includes(email.toLowerCase())) {
      const channelKey = nanoid(6).toUpperCase()
      const channel = await prisma.channel.create({
        data: { userId: sub, name: name.trim(), channelKey, plan: 'admin', expiresAt: null },
      })
      return reply.status(201).send({ adminBypass: true, channel })
    }

    const stripe = lagStripe()
    const planInfo = PLANER[plan]
    const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'nok',
      line_items: [{
        price_data: {
          currency: 'nok',
          unit_amount: planInfo.øre,
          product_data: {
            name: `CuriousTide – kanal (${planInfo.navn})`,
            description: `Kanalnavn: ${name.trim()}`,
          },
        },
        quantity: 1,
      }],
      metadata: { userId: sub, channelName: name.trim(), plan },
      success_url: `${baseUrl}/dashboard?payment=success`,
      cancel_url:  `${baseUrl}/dashboard?payment=cancelled`,
    })

    return { url: session.url }
  })

  // ── POST /payments/webhook ─────────────────────────────────────────────────
  // Stripe kaller dette endepunktet ved vellykket betaling.
  // Ruten er unntatt fra JWT-verifisering (se index.ts).
  app.post('/webhook', { config: { rawBody: true } }, async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) return reply.status(500).send({ error: 'Webhook-secret mangler' })

    let event: ReturnType<typeof Stripe.prototype.webhooks.constructEvent>
    try {
      const stripe = lagStripe()
      event = stripe.webhooks.constructEvent(
        (request as any).rawBody ?? Buffer.from(JSON.stringify(request.body)),
        sig,
        webhookSecret,
      )
    } catch (err: any) {
      app.log.warn(`Stripe webhook-feil: ${err.message}`)
      return reply.status(400).send({ error: err.message })
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as { metadata: Record<string, string> | null }
      const { userId, channelName, plan } = session.metadata ?? {}

      if (userId && channelName && plan && PLANER[plan]) {
        const planInfo = PLANER[plan]
        const channelKey = nanoid(6).toUpperCase()
        await prisma.channel.create({
          data: {
            userId,
            name: channelName,
            channelKey,
            plan,
            expiresAt: leggTilDager(new Date(), planInfo.dager),
          },
        })
        app.log.info(`Kanal opprettet etter betaling: ${channelName} (${plan})`)
      }
    }

    return { received: true }
  })
}
