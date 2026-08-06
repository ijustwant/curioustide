import { Expo } from 'expo-server-sdk'
import webpush from 'web-push'
import type { PrismaClient } from '@prisma/client'

const expo = new Expo()

let vapidConfigured = false
function ensureVapid() {
  if (vapidConfigured) return
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:hjelp@curioustide.no'
  if (!publicKey || !privateKey) throw new Error('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY mangler i .env')
  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
}

export type PushPayload = { title: string; body: string }

export async function sendExpoPushNotifications(
  prisma: PrismaClient,
  tokens: { id: string; expoToken: string }[],
  payload: PushPayload
): Promise<void> {
  const valid = tokens.filter((t) => Expo.isExpoPushToken(t.expoToken))
  const messages = valid.map((t) => ({
    to: t.expoToken,
    title: payload.title,
    body: payload.body,
    sound: 'default' as const,
  }))

  const chunks = expo.chunkPushNotifications(messages)
  const staleTokenIds: string[] = []

  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk)
      receipts.forEach((receipt, i) => {
        if (receipt.status === 'error' && receipt.details?.error === 'DeviceNotRegistered') {
          staleTokenIds.push(valid[i].id)
        }
      })
    } catch (err) {
      console.error('[push] Expo-sending feilet for en chunk:', err)
    }
  }

  if (staleTokenIds.length) {
    await prisma.pushToken.deleteMany({ where: { id: { in: staleTokenIds } } })
  }
}

export async function sendWebPushNotifications(
  prisma: PrismaClient,
  subs: { id: string; endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload
): Promise<void> {
  ensureVapid()
  const staleSubIds: string[] = []

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          staleSubIds.push(sub.id)
        } else {
          console.error('[push] Web push-sending feilet:', err?.message ?? err)
        }
      }
    })
  )

  if (staleSubIds.length) {
    await prisma.webPushSubscription.deleteMany({ where: { id: { in: staleSubIds } } })
  }
}
