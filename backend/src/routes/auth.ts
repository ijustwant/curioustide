import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { generateResetToken, sendPasswordResetEmail } from '../services/email'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const forgotSchema = z.object({
  email: z.string().email(),
})

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export default async function authRoutes(app: FastifyInstance) {
  const prisma: PrismaClient = (app as any).prisma

  app.post('/register', async (request, reply) => {
    const body = registerSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const existing = await prisma.user.findUnique({ where: { email: body.data.email } })
    if (existing) return reply.status(409).send({ error: 'Email already registered' })

    const passwordHash = await bcrypt.hash(body.data.password, 12)
    const user = await prisma.user.create({
      data: { email: body.data.email, passwordHash, name: body.data.name },
    })

    const token = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '7d' })
    return { token, user: { id: user.id, email: user.email, name: user.name } }
  })

  app.post('/login', async (request, reply) => {
    const body = loginSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() })

    const user = await prisma.user.findUnique({ where: { email: body.data.email } })
    if (!user) return reply.status(401).send({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(body.data.password, user.passwordHash)
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' })

    const token = app.jwt.sign({ sub: user.id, email: user.email }, { expiresIn: '7d' })
    return { token, user: { id: user.id, email: user.email, name: user.name } }
  })

  app.get('/me', async (request) => {
    const payload = request.user as { sub: string }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.sub } })
    return { id: user.id, email: user.email, name: user.name }
  })

  // Always returns 200 to avoid leaking which emails exist
  app.post('/forgot-password', async (request, reply) => {
    const body = forgotSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid email' })

    const user = await prisma.user.findUnique({ where: { email: body.data.email } })
    if (user) {
      // Delete any existing tokens for this user
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

      const token = generateResetToken()
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await prisma.passwordResetToken.create({
        data: { userId: user.id, token, expiresAt },
      })

      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost'
      const resetUrl = `${frontendUrl}/reset-password?token=${token}`

      await sendPasswordResetEmail({ til: user.email, resetUrl })
    }

    return reply.status(200).send({ ok: true })
  })

  app.post('/reset-password', async (request, reply) => {
    const body = resetSchema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Invalid input' })

    const record = await prisma.passwordResetToken.findUnique({
      where: { token: body.data.token },
      include: { user: true },
    })

    if (!record || record.expiresAt < new Date()) {
      return reply.status(400).send({ error: 'Token is invalid or has expired' })
    }

    const passwordHash = await bcrypt.hash(body.data.password, 12)
    await prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    })
    await prisma.passwordResetToken.delete({ where: { id: record.id } })

    return { ok: true }
  })
}
