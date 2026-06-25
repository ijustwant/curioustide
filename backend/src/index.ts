import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import cron from 'node-cron'
import authRoutes from './routes/auth'
import channelRoutes from './routes/channels'
import eventRoutes from './routes/events'
import paymentRoutes from './routes/payments'
import notificationRoutes from './routes/notifications'
import adminRoutes from './routes/admin'
import { deleteExpiredRecordings } from './services/recording'

async function main() {
  const prisma = new PrismaClient()
  const app = Fastify({ logger: true })

  app.decorate('prisma', prisma)

  await app.register(cors, { origin: true, credentials: true })

  // Save raw body buffer for Stripe webhook signature verification
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, buf, done) => {
    ;(req as any).rawBody = buf
    try {
      done(null, JSON.parse(buf.toString('utf8')))
    } catch (err: any) {
      err.statusCode = 400
      done(err, undefined)
    }
  })

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'changeme_jwt_secret_32chars_min',
  })

  const openRoutes = [
    { method: 'POST', url: '/auth/register' },
    { method: 'POST', url: '/auth/login' },
    { method: 'POST', url: '/auth/forgot-password' },
    { method: 'POST', url: '/auth/reset-password' },
    { method: 'GET',  url: '/health' },
    { method: 'POST', url: '/payments/webhook' },  // Stripe signerer selv
  ]

  app.addHook('onRequest', async (request, reply) => {
    const isOpen = openRoutes.some(
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
  await app.register(paymentRoutes, { prefix: '/payments' })
  await app.register(notificationRoutes, { prefix: '/notifications' })
  await app.register(adminRoutes, { prefix: '/admin' })

  app.get('/health', async () => ({ status: 'ok' }))

  cron.schedule('0 3 * * *', async () => {
    app.log.info('Running expired recording cleanup')
    await deleteExpiredRecordings(prisma)
  })

  const port = Number(process.env.PORT ?? 4000)
  await app.listen({ port, host: '0.0.0.0' })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
