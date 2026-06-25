import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'tommylarsen40@gmail.com')
  .split(',').map((e) => e.trim().toLowerCase())

function sjekkAdmin(request: any, reply: any): boolean {
  const email = (request.user as { email: string })?.email?.toLowerCase()
  if (!ADMIN_EMAILS.includes(email)) {
    reply.status(403).send({ error: 'Forbidden' })
    return false
  }
  return true
}

export default async function adminRoutes(app: FastifyInstance) {
  const prisma: PrismaClient = (app as any).prisma

  app.get('/users', async (request, reply) => {
    if (!sjekkAdmin(request, reply)) return
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { channels: true } } },
    })
    return users.map((u) => ({
      id:        u.id,
      email:     u.email,
      name:      u.name,
      createdAt: u.createdAt,
      channels:  u._count.channels,
    }))
  })

  app.get('/users/:id/channels', async (request, reply) => {
    if (!sjekkAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    return prisma.channel.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
    })
  })

  app.delete('/users/:id', async (request, reply) => {
    if (!sjekkAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    const self = (request.user as { sub: string }).sub
    if (id === self) return reply.status(400).send({ error: 'Cannot delete yourself' })
    await prisma.user.delete({ where: { id } })
    return reply.status(204).send()
  })

  app.patch('/users/:id', async (request, reply) => {
    if (!sjekkAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    const schema = z.object({ name: z.string().optional(), email: z.string().email().optional() })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid input' })
    const user = await prisma.user.update({ where: { id }, data: body.data })
    return { id: user.id, email: user.email, name: user.name }
  })

  app.delete('/users/:id/channels/:channelId', async (request, reply) => {
    if (!sjekkAdmin(request, reply)) return
    const { channelId } = request.params as { id: string; channelId: string }
    await prisma.channel.delete({ where: { id: channelId } })
    return reply.status(204).send()
  })
}
