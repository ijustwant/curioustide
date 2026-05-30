import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { startRecording, stopRecording } from '../services/recording'
import { getDownloadUrl } from '../services/minio'

const createSchema = z.object({
  channelId: z.string().uuid(),
  name: z.string().min(1).max(200),
})

const startSchema = z.object({
  record: z.boolean().optional().default(false),
  allowDownload: z.boolean().optional().default(false),
})

export default async function eventRoutes(app: FastifyInstance) {
  const prisma: PrismaClient = (app as any).prisma

  app.get('/', async (request) => {
    const { sub } = request.user as { sub: string }
    const events = await prisma.event.findMany({
      where: { channel: { userId: sub } },
      include: { channel: { select: { name: true, channelKey: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return events
  })

  app.post('/', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const body = createSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const channel = await prisma.channel.findFirst({
      where: { id: body.data.channelId, userId: sub },
    })
    if (!channel) return reply.status(404).send({ error: 'Channel not found' })

    const event = await prisma.event.create({
      data: { channelId: channel.id, name: body.data.name },
    })
    return reply.status(201).send(event)
  })

  app.post('/:id/start', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    const body = startSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const event = await prisma.event.findFirst({
      where: { id, channel: { userId: sub } },
      include: { channel: true },
    })
    if (!event) return reply.status(404).send({ error: 'Not found' })
    if (event.status === 'live') return reply.status(409).send({ error: 'Already live' })

    const roomName = `ch_${event.channel.channelKey}`
    let recordingPath: string | null = null

    if (body.data.record) {
      recordingPath = await startRecording(roomName, event.id)
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        status: 'live',
        startedAt: new Date(),
        livekitRoomName: roomName,
        recordingPath,
        allowDownload: body.data.allowDownload,
        recordingExpiresAt: body.data.record
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          : null,
      },
    })
    return updated
  })

  app.post('/:id/stop', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }

    const event = await prisma.event.findFirst({
      where: { id, channel: { userId: sub } },
    })
    if (!event) return reply.status(404).send({ error: 'Not found' })
    if (event.status !== 'live') return reply.status(409).send({ error: 'Not live' })

    if (event.recordingPath && event.livekitRoomName) {
      await stopRecording(event.livekitRoomName)
    }

    const updated = await prisma.event.update({
      where: { id },
      data: { status: 'ended', endedAt: new Date() },
    })
    return updated
  })

  app.get('/:id/download', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }

    const event = await prisma.event.findFirst({
      where: { id, channel: { userId: sub } },
    })
    if (!event) return reply.status(404).send({ error: 'Not found' })
    if (!event.recordingPath) return reply.status(404).send({ error: 'No recording' })
    if (!event.allowDownload) return reply.status(403).send({ error: 'Download not enabled' })

    const url = await getDownloadUrl(event.recordingPath)
    return { url }
  })
}
