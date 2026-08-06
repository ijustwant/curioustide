import { api } from './api'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

export async function subscribeToPush(token: string): Promise<void> {
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  if (!vapidKey) throw new Error('VITE_VAPID_PUBLIC_KEY er ikke satt')
  if (!isPushSupported()) throw new Error('Push-varsler støttes ikke i denne nettleseren')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Tillatelse ikke gitt')

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
  }

  const json = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  await api.subscribeToPush(token, json.endpoint, json.keys)
}
