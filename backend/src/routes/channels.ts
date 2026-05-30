import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { nanoid } from 'nanoid'
import { generateLivekitToken } from '../services/livekit'

const createSchema = z.object({
  name: z.string().min(1).max(100),
})

export default async function channelRoutes(app: FastifyInstance) {
  const prisma: PrismaClient = (app as any).prisma
  const maxFree = Number(process.env.MAX_FREE_CHANNELS ?? 3)

  app.get('/', async (request) => {
    const { sub } = request.user as { sub: string }
    const channels = await prisma.channel.findMany({
      where: { userId: sub },
      include: { events: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    })
    return channels
  })

  app.post('/', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    if (maxFree > 0) {
      const count = await prisma.channel.count({ where: { userId: sub } })
      if (count >= maxFree)
        return reply.status(403).send({ error: `Free tier allows ${maxFree} channels` })
    }

    const channelKey = nanoid(6).toUpperCase()
    const channel = await prisma.channel.create({
      data: { userId: sub, name: body.data.name, channelKey },
    })
    return reply.status(201).send(channel)
  })

  app.delete('/:id', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    const channel = await prisma.channel.findFirst({ where: { id, userId: sub } })
    if (!channel) return reply.status(404).send({ error: 'Not found' })
    await prisma.channel.delete({ where: { id } })
    return reply.status(204).send()
  })

  // Generate LiveKit token for a channel (sender or receiver)
  app.post('/:id/token', async (request, reply) => {
    const { sub, email } = request.user as { sub: string; email: string }
    const { id } = request.params as { id: string }
    const { role } = (request.body as any) ?? {}

    const channel = await prisma.channel.findFirst({
      where: { id, isActive: true },
    })
    if (!channel) return reply.status(404).send({ error: 'Channel not found' })

    const canPublish = role === 'speaker' && channel.userId === sub
    const token = await generateLivekitToken({
      roomName: `ch_${channel.channelKey}`,
      participantIdentity: sub,
      participantName: email,
      canPublish,
      canSubscribe: true,
    })
    return { token, roomName: `ch_${channel.channelKey}`, channelKey: channel.channelKey }
  })

  // Public: join by channelKey (for listeners entering a key manually)
  app.post('/join/:key', async (request, reply) => {
    const { sub, email } = request.user as { sub: string; email: string }
    const { key } = request.params as { key: string }

    const channel = await prisma.channel.findFirst({
      where: { channelKey: key.toUpperCase(), isActive: true },
    })
    if (!channel) return reply.status(404).send({ error: 'Channel not found' })

    const token = await generateLivekitToken({
      roomName: `ch_${channel.channelKey}`,
      participantIdentity: sub,
      participantName: email,
      canPublish: false,
      canSubscribe: true,
    })
    return { token, roomName: `ch_${channel.channelKey}`, channelName: channel.name }
  })
}
