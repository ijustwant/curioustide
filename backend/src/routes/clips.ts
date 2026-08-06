import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { nanoid } from 'nanoid'
import { getUploadUrl, getDownloadUrl, deleteObject } from '../services/minio'
import { playClipIntoRoom } from '../services/ingress'

function kanStyre(channel: { userId: string }, sub: string, invite: { status: string } | null): boolean {
  return channel.userId === sub || invite?.status === 'accepted'
}

export default async function clipRoutes(app: FastifyInstance) {
  const prisma: PrismaClient = (app as any).prisma

  async function finnKanalOgTilgang(id: string, sub: string) {
    const channel = await prisma.channel.findFirst({ where: { id, isActive: true } })
    if (!channel) return { channel: null, harTilgang: false }
    const isOwner = channel.userId === sub
    const invite = !isOwner
      ? await prisma.channelInvite.findFirst({ where: { channelId: id, invitedUserId: sub, status: 'accepted' } })
      : null
    return { channel, harTilgang: kanStyre(channel, sub, invite) }
  }

  app.post('/:id/clips/upload-url', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    const { channel, harTilgang } = await finnKanalOgTilgang(id, sub)
    if (!channel) return reply.status(404).send({ error: 'Channel not found' })
    if (!harTilgang) return reply.status(403).send({ error: 'Ikke tillatt' })

    const objectPath = `clips/${id}/${nanoid(12)}.m4a`
    const uploadUrl = await getUploadUrl(objectPath)
    return { uploadUrl, objectPath }
  })

  app.post('/:id/clips', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    const body = z.object({
      objectPath: z.string().min(1),
      durationMs: z.number().int().positive().optional(),
      name: z.string().min(1).max(100).optional(),
    }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const { channel, harTilgang } = await finnKanalOgTilgang(id, sub)
    if (!channel) return reply.status(404).send({ error: 'Channel not found' })
    if (!harTilgang) return reply.status(403).send({ error: 'Ikke tillatt' })

    const defaultNavn = `Intervju ${new Date().toLocaleDateString('no-NO')} ${new Date().toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}`

    const clip = await prisma.interviewClip.create({
      data: {
        channelId: id,
        name: body.data.name ?? defaultNavn,
        objectPath: body.data.objectPath,
        durationMs: body.data.durationMs,
      },
    })
    return reply.status(201).send(clip)
  })

  app.get('/:id/clips', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id } = request.params as { id: string }
    const { channel, harTilgang } = await finnKanalOgTilgang(id, sub)
    if (!channel) return reply.status(404).send({ error: 'Channel not found' })
    if (!harTilgang) return reply.status(403).send({ error: 'Ikke tillatt' })

    const clips = await prisma.interviewClip.findMany({
      where: { channelId: id },
      orderBy: { createdAt: 'desc' },
    })
    return clips
  })

  app.patch('/:id/clips/:clipId', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id, clipId } = request.params as { id: string; clipId: string }
    const body = z.object({ name: z.string().min(1).max(100) }).safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const { channel, harTilgang } = await finnKanalOgTilgang(id, sub)
    if (!channel) return reply.status(404).send({ error: 'Channel not found' })
    if (!harTilgang) return reply.status(403).send({ error: 'Ikke tillatt' })

    const clip = await prisma.interviewClip.findFirst({ where: { id: clipId, channelId: id } })
    if (!clip) return reply.status(404).send({ error: 'Klipp ikke funnet' })

    const updated = await prisma.interviewClip.update({
      where: { id: clipId },
      data: { name: body.data.name },
    })
    return updated
  })

  app.post('/:id/clips/:clipId/play', async (request, reply) => {
    const { sub, email } = request.user as { sub: string; email: string }
    const { id, clipId } = request.params as { id: string; clipId: string }
    const { channel, harTilgang } = await finnKanalOgTilgang(id, sub)
    if (!channel) return reply.status(404).send({ error: 'Channel not found' })
    if (!harTilgang) return reply.status(403).send({ error: 'Ikke tillatt' })

    const clip = await prisma.interviewClip.findFirst({ where: { id: clipId, channelId: id } })
    if (!clip) return reply.status(404).send({ error: 'Klipp ikke funnet' })

    const clipUrl = await getDownloadUrl(clip.objectPath)
    const ingress = await playClipIntoRoom(`ch_${channel.channelKey}`, clipUrl, email)
    return { ok: true, ingressId: ingress.ingressId }
  })

  app.delete('/:id/clips/:clipId', async (request, reply) => {
    const { sub } = request.user as { sub: string }
    const { id, clipId } = request.params as { id: string; clipId: string }
    const { channel, harTilgang } = await finnKanalOgTilgang(id, sub)
    if (!channel) return reply.status(404).send({ error: 'Channel not found' })
    if (!harTilgang) return reply.status(403).send({ error: 'Ikke tillatt' })

    const clip = await prisma.interviewClip.findFirst({ where: { id: clipId, channelId: id } })
    if (!clip) return reply.status(404).send({ error: 'Klipp ikke funnet' })

    try {
      await deleteObject(clip.objectPath)
    } catch {
      // Objektet kan allerede være borte
    }
    await prisma.interviewClip.delete({ where: { id: clipId } })
    return reply.status(204).send()
  })
}
