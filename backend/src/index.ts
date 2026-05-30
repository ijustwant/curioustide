import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import cron from 'node-cron'
import authRoutes from './routes/auth'
import channelRoutes from './routes/channels'
import eventRoutes from './routes/events'
import { deleteExpiredRecordings } from './services/recording'

const prisma = new PrismaClient()
const app = Fastify({ logger: true })

app.decorate('prisma', prisma)

await app.register(cors, {
  origin: true,
  credentials: true,
})

await app.register(jwt, {
  secret: process.env.JWT_SECRET ?? 'changeme_jwt_secret_32chars_min',
})

app.addHook('onRequest', async (request, reply) => {
  const open = [
    { method: 'POST', url: '/auth/register' },
    { method: 'POST', url: '/auth/login' },
  ]
  const isOpen = open.some(
    (r) => r.method === request.method && request.url.startsWith(r.url)
  )
  if (!isOpen) {
    try {
      await request.jwtVerify()
    } catch {
      reply.status(401).send({ error: 'Unauthorized' })
    }
  }
})

await app.register(authRoutes, { prefix: '/auth' })
await app.register(channelRoutes, { prefix: '/channels' })
await app.register(eventRoutes, { prefix: '/events' })

app.get('/health', async () => ({ status: 'ok' }))

// Daily cron: delete recordings older than 30 days
cron.schedule('0 3 * * *', async () => {
  app.log.info('Running expired recording cleanup')
  await deleteExpiredRecordings(prisma)
})

const port = Number(process.env.PORT ?? 4000)
await app.listen({ port, host: '0.0.0.0' })
