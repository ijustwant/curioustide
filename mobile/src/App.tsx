import 'react-native-gesture-handler'
import { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { registerGlobals } from '@livekit/react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import LoginScreen from './screens/LoginScreen'
import DashboardScreen from './screens/DashboardScreen'
import SpeakScreen from './screens/SpeakScreen'
import ListenScreen from './screens/ListenScreen'
import { useAuthStore } from './store/auth'

export type RootStackParamList = {
  Login: undefined
  Dashboard: undefined
  Speak: { channelId: string; channelName: string; channelKey: string }
  Listen: undefined
}

const Stack = createStackNavigator<RootStackParamList>()

registerGlobals()

export default function App() {
  const token = useAuthStore((s) => s.token)

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#0f172a' },
            headerTintColor: '#38bdf8',
            headerTitleStyle: { fontWeight: 'bold' },
            cardStyle: { backgroundColor: '#020617' },
          }}
        >
          {!token ? (
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          ) : (
            <>
              <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'CuriousTide', headerLeft: () => null }} />
              <Stack.Screen name="Speak" component={SpeakScreen} options={{ title: 'Send lyd' }} />
              <Stack.Screen name="Listen" component={ListenScreen} options={{ title: 'Lytt' }} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  )
}
