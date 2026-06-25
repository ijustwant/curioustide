import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { sendPiOnlineEmail } from '../services/email'

const piOnlineSchema = z.object({
  ip:   z.string().min(1),
  port: z.number().int().default(8080),
})

export default async function notificationRoutes(app: FastifyInstance) {
  const prisma: PrismaClient = (app as any).prisma

  // Pi kaller dette etter oppstart med sin lokale IP
  app.post('/pi-online', async (request, reply) => {
    const body = piOnlineSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid input' })

    const payload = request.user as { sub: string; email: string }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user) return reply.status(404).send({ error: 'User not found' })

    await sendPiOnlineEmail({ til: user.email, ip: body.data.ip, port: body.data.port })
    return { ok: true }
  })
}
