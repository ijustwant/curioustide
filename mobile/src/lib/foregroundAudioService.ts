import { Platform } from 'react-native'
import notifee, { AndroidImportance } from '@notifee/react-native'

const CHANNEL_ID = 'broadcast'

// Kalles én gang ved appstart (App.tsx) — registrerer selve foreground-service-loopen
// som Android krever for å holde mikrofon-capture i live når skjermen låses.
export function registerForegroundAudioService() {
  if (Platform.OS !== 'android') return
  notifee.registerForegroundService(() => new Promise(() => {
    // Holdes åpen så lenge notifikasjonen (og dermed tjenesten) lever.
  }))
}

export async function startBroadcastForegroundService(title: string, body: string) {
  if (Platform.OS !== 'android') return
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Sending',
    importance: AndroidImportance.LOW,
  })
  await notifee.displayNotification({
    title,
    body,
    android: {
      channelId: CHANNEL_ID,
      asForegroundService: true,
      ongoing: true,
      colorized: true,
      smallIcon: 'ic_launcher',
      foregroundServiceTypes: [1], // FOREGROUND_SERVICE_TYPE_MICROPHONE
    },
  })
}

export async function stopBroadcastForegroundService() {
  if (Platform.OS !== 'android') return
  await notifee.stopForegroundService()
}
