import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { nanoid } from 'nanoid'
import { generateLivekitToken } from '../services/livekit'
import { sendTimerStartetEmail } from '../services/email'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'tommylarsen40@gmail.com')
  .split(',').map((e) => e.trim().toLowerCase())

const PLAN_DAGER: Record<string, number> = { '3dager': 3, '14dager': 14 }

function erUtløpt(channel: { expiresAt: Date | null; plan: string | null }): boolean {
  if (!channel.expiresAt) return false       // admin eller ikke startet ennå
  return channel.expiresAt < new Date()
}

export default async function channelRoutes(app: FastifyInstance) {
  const prisma: PrismaClient = (app as any).prisma

  app.get('/', async (request) => {
    const { sub } = request.user as { sub: string }
    const channels = await prisma.channel.findMany({
      where: { userId: sub },
      include: { events: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { createdAt: 'desc' },
    })
    return channels
  })

  // Direkte opprettelse (kun admin – alle andre går via /payments/checkout)
  app.post('/', async (request, reply) => {
    const { sub, email } = request.user as { sub: string; email: string }
    const body = z.object({ name: z.string().min(1).max(100) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    if (!ADMIN_EMAILS.includes(email.toLowerCase()))
      return reply.status(403).send({ error: 'Bruk /payments/checkout for å opprette kanal' })

    const channelKey = nanoid(6).toUpperCase()
    const channel = await prisma.channel.create({
      data: { userId: sub, name: body.data.name, channelKey, plan: 'admin', expiresAt: null },
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

  app.post('/:id/token', async (request, reply) => {
    const { sub, email } = request.user as { sub: string; email: string }
    const { id } = request.params as { id: string }
    const { role } = (request.body as any) ?? {}

    const channel = await prisma.channel.findFirst({ where: { id, isActive: true } })
    if (!channel) return reply.status(404).send({ error: 'Channel not found' })
    if (erUtløpt(channel)) return reply.status(410).send({ error: 'Kanalen har utløpt' })

    const canPublish = role === 'speaker' && channel.userId === sub

    // Start timer ved første sending
    if (canPublish && !channel.firstSentAt && channel.plan && PLAN_DAGER[channel.plan]) {
      const dager = PLAN_DAGER[channel.plan]
      const utløper = new Date()
      utløper.setDate(utløper.getDate() + dager)

      await prisma.channel.update({
        where: { id },
        data: { firstSentAt: new Date(), expiresAt: utløper },
      })

      sendTimerStartetEmail({ til: email, kanalNavn: channel.name, utløper }).catch(() => {})
    }

    const identity = canPublish ? `${sub}:spk` : `${sub}:lst:${Date.now()}`
    const token = await generateLivekitToken({
      roomName: `ch_${channel.channelKey}`,
      participantIdentity: identity,
      participantName: email,
      canPublish,
      canSubscribe: true,
    })
    return { token, roomName: `ch_${channel.channelKey}`, channelKey: channel.channelKey }
  })

  app.post('/join/:key', async (request, reply) => {
    const { sub, email } = request.user as { sub: string; email: string }
    const { key } = request.params as { key: string }

    const channel = await prisma.channel.findFirst({
      where: { channelKey: key.toUpperCase(), isActive: true },
    })
    if (!channel) return reply.status(404).send({ error: 'Channel not found' })
    if (erUtløpt(channel)) return reply.status(410).send({ error: 'Kanalen har utløpt' })

    const token = await generateLivekitToken({
      roomName: `ch_${channel.channelKey}`,
      participantIdentity: `${sub}:lst:${Date.now()}`,
      participantName: email,
      canPublish: false,
      canSubscribe: true,
    })
    return { token, roomName: `ch_${channel.channelKey}`, channelName: channel.name }
  })
}
