import { NavigationContainer, LinkingOptions } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { registerGlobals } from '@livekit/react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import LoginScreen from './screens/LoginScreen'
import ForgotPasswordScreen from './screens/ForgotPasswordScreen'
import DashboardScreen from './screens/DashboardScreen'
import SpeakScreen from './screens/SpeakScreen'
import ListenScreen from './screens/ListenScreen'
import HelpScreen from './screens/HelpScreen'
import { useAuthStore } from './store/auth'
import { getLang } from './i18n'

export type RootStackParamList = {
  Login: undefined
  ForgotPassword: undefined
  Dashboard: undefined
  Speak: { channelId: string; channelName: string; channelKey: string }
  Listen: undefined
  Help: undefined
}

const Stack = createNativeStackNavigator<RootStackParamList>()

registerGlobals()

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['curioustide://'],
  config: {
    screens: {
      Dashboard: 'dashboard',
      Login: 'login',
    },
  },
}

export default function App() {
  const token = useAuthStore((s) => s.token)
  const lang = getLang()

  const titles = {
    speak:  lang === 'en' ? 'Broadcast' : 'Send lyd',
    listen: lang === 'en' ? 'Listen'    : 'Lytt',
    help:   lang === 'en' ? 'Help'      : 'Hjelp',
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer linking={linking}>
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: '#0f172a' },
              headerTintColor: '#38bdf8',
              headerTitleStyle: { fontWeight: 'bold' },
              contentStyle: { backgroundColor: '#020617' },
            }}
          >
            {!token ? (
              <>
                <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ headerShown: false }} />
              </>
            ) : (
              <>
                <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'CuriousTide', headerBackVisible: false }} />
                <Stack.Screen name="Speak" component={SpeakScreen} options={{ title: titles.speak }} />
                <Stack.Screen name="Listen" component={ListenScreen} options={{ title: titles.listen }} />
                <Stack.Screen name="Help" component={HelpScreen} options={{ title: titles.help }} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
