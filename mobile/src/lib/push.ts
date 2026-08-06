import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { api } from '../services/api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export async function registerForPushNotificationsAsync(authToken: string): Promise<void> {
  const { status: existing } = await Notifications.getPermissionsAsync()
  let status = existing
  if (status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync()
    status = req.status
  }
  if (status !== 'granted') return

  const projectId = Constants.expoConfig?.extra?.eas?.projectId
  const { data: expoToken } = await Notifications.getExpoPushTokenAsync({ projectId })

  const platform = Platform.OS === 'ios' ? 'ios' : 'android'
  await api.registerPushToken(authToken, expoToken, platform)
}
