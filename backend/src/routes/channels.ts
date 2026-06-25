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

  // Hent ventende invitasjoner og delte kanaler for innlogget bruker
  app.get('/invites', async (request) => {
    const { sub } = request.user as { sub: string }
    const pending = await prisma.channelInvite.findMany({
      where: { invitedUserId: sub, status: 'pending' },
      include: { channel: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
    })
    const accepted = await prisma.channelInvite.findMany({
      where: { invitedUserId: sub, status: 'accepted' },
      include: { channel: true },
      orderBy: { createdAt: 'desc' },
    })
    return {
      pending: pending.map((i) => ({
        id: i.id,
        channelName: i.channel.name,
        channelId: i.channel.id,
        ownerEmail: i.channel.user.email,
        createdAt: i.createdAt,
      })),
      shared: accepted.map((i) => i.channel),
    }
  })

  // Godta invitasjon
  app.post('/invites/:inviteId/accept', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { inviteId } = request.params as { inviteId: string }
    const invite = await prisma.channelInvite.findFirst({
      where: { id: inviteId, invitedUserId: sub, status: 'pending' },
    })
    if (!invite) return reply.status(404).send({ error: 'Invitasjon ikke funnet' })
    await prisma.channelInvite.update({ where: { id: inviteId }, data: { status: 'accepted' } })
    return { ok: true }
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

  // Inviter en annen bruker som medtaler
  app.post('/:id/invite', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    const body = z.object({ email: z.string().email() }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Ugyldig e-post' })

    const channel = await prisma.channel.findFirst({ where: { id, userId: sub } })
    if (!channel) return reply.status(404).send({ error: 'Kanal ikke funnet' })

    const invitedUser = await prisma.user.findUnique({ where: { email: body.data.email } })
    if (!invitedUser) return reply.status(404).send({ error: 'Bruker ikke funnet' })
    if (invitedUser.id === sub) return reply.status(400).send({ error: 'Du kan ikke invitere deg selv' })

    const existing = await prisma.channelInvite.findFirst({
      where: { channelId: id, invitedUserId: invitedUser.id },
    })
    if (existing) {
      if (existing.status === 'pending') return reply.status(409).send({ error: 'Allerede invitert' })
      await prisma.channelInvite.update({ where: { id: existing.id }, data: { status: 'pending' } })
      return reply.status(200).send({ ok: true })
    }

    await prisma.channelInvite.create({
      data: { channelId: id, invitedUserId: invitedUser.id },
    })
    return reply.status(201).send({ ok: true })
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

    const isOwner = channel.userId === sub
    const invite = role === 'speaker' && !isOwner
      ? await prisma.channelInvite.findFirst({ where: { channelId: id, invitedUserId: sub, status: 'accepted' } })
      : null
    const canPublish = role === 'speaker' && (isOwner || !!invite)

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
