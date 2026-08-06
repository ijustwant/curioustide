import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

export default async function pushRoutes(app: FastifyInstance) {
  const prisma: PrismaClient = (app as any).prisma

  // Mobil: registrer Expo push-token
  app.post('/register', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const body = z.object({
      expoToken: z.string().min(1),
      platform: z.enum(['ios', 'android']),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    await prisma.pushToken.upsert({
      where: { expoToken: body.data.expoToken },
      update: { userId: sub, platform: body.data.platform },
      create: { userId: sub, expoToken: body.data.expoToken, platform: body.data.platform },
    })
    return { ok: true }
  })

  // Nettside: registrer web push-abonnement
  app.post('/subscribe', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const body = z.object({
      endpoint: z.string().url(),
      keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    await prisma.webPushSubscription.upsert({
      where: { endpoint: body.data.endpoint },
      update: { userId: sub, p256dh: body.data.keys.p256dh, auth: body.data.keys.auth },
      create: {
        userId: sub,
        endpoint: body.data.endpoint,
        p256dh: body.data.keys.p256dh,
        auth: body.data.keys.auth,
      },
    })
    return { ok: true }
  })

  app.delete('/subscribe', async (request, reply) => {
    const body = z.object({ endpoint: z.string().url() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    await prisma.webPushSubscription.deleteMany({ where: { endpoint: body.data.endpoint } })
    return { ok: true }
  })
}
