import { useEffect, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Audio } from 'expo-av'
import { Room, RoomEvent, createLocalAudioTrack } from '@livekit/react-native'
import type { StackScreenProps } from '@react-navigation/stack'
import type { RootStackParamList } from '../App'
import { api } from '../services/api'
import { useAuthStore } from '../store/auth'
import { startTestTone, stopTestTone } from '../lib/testTone'

type Props = StackScreenProps<RootStackParamList, 'Speak'>
type Status = 'idle' | 'connecting' | 'live' | 'error'

const LIVEKIT_URL = __DEV__ ? 'ws://192.168.50.10:7880' : 'wss://your-domain.com/livekit'

export default function SpeakScreen({ route, navigation }: Props) {
  const { channelId, channelName, channelKey } = route.params
  const token = useAuthStore((s) => s.token)
  const roomRef = useRef<Room | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect()
      stopTestTone()
    }
  }, [])

  async function startStream() {
    if (!token) return
    setStatus('connecting')
    try {
      await Audio.requestPermissionsAsync()
      const { token: lvToken } = await api.getChannelToken(token, channelId, 'speaker')

      const room = new Room()
      roomRef.current = room
      room.on(RoomEvent.Disconnected, () => setStatus('idle'))

      await room.connect(LIVEKIT_URL, lvToken)
      const audioTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      })
      await room.localParticipant.publishTrack(audioTrack)
      setStatus('live')
    } catch (err: any) {
      Alert.alert('Feil', err.message)
      setStatus('error')
    }
  }

  async function stopStream() {
    roomRef.current?.disconnect()
    roomRef.current = null
    setStatus('idle')
  }

  async function toggleTest() {
    if (testing) {
      await stopTestTone()
      setTesting(false)
    } else {
      await startTestTone()
      setTesting(true)
    }
  }

  return (
    <View style={s.root}>
      <View style={s.info}>
        <Text style={s.channelName}>{channelName}</Text>
        <View style={s.keyBadge}>
          <Text style={s.keyLabel}>Kanal-ID</Text>
          <Text style={s.keyValue}>{channelKey}</Text>
        </View>
      </View>

      {status === 'live' && (
        <View style={s.liveBadge}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>LIVE – sender lyd</Text>
        </View>
      )}

      <View style={s.buttons}>
        {status !== 'live' ? (
          <TouchableOpacity
            style={[s.btn, s.startBtn, status === 'connecting' && s.disabled]}
            onPress={startStream}
            disabled={status === 'connecting'}
            activeOpacity={0.8}
          >
            <Text style={s.btnText}>
              {status === 'connecting' ? 'Kobler til...' : '▶  Start'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.btn, s.stopBtn]} onPress={stopStream} activeOpacity={0.8}>
            <Text style={s.btnText}>⏹  Stopp</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[s.btn, s.testBtn, testing && s.testBtnActive]}
          onPress={toggleTest}
          activeOpacity={0.8}
        >
          <Text style={s.btnText}>{testing ? '⏹  Stopp test' : '🔊  Test (2kHz)'}</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.hint}>
        Del kanal-ID med lyttere.{'\n'}Test-tonen spiller 2kHz hvert 1,5 sekund.
      </Text>
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617', alignItems: 'center', justifyContent: 'center', padding: 24 },
  info: { alignItems: 'center', marginBottom: 32 },
  channelName: { fontSize: 24, fontWeight: 'bold', color: '#f1f5f9', marginBottom: 12 },
  keyBadge: { backgroundColor: '#0f172a', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center' },
  keyLabel: { color: '#64748b', fontSize: 12, marginBottom: 2 },
  keyValue: { color: '#38bdf8', fontSize: 28, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 4 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#052e16', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 20, marginBottom: 24 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ade80' },
  liveText: { color: '#4ade80', fontWeight: '700', fontSize: 16 },
  buttons: { width: '100%', gap: 16, marginBottom: 32 },
  btn: { borderRadius: 20, paddingVertical: 22, alignItems: 'center', justifyContent: 'center' },
  startBtn: { backgroundColor: '#0284c7' },
  stopBtn: { backgroundColor: '#b91c1c' },
  testBtn: { backgroundColor: '#1e293b' },
  testBtnActive: { backgroundColor: '#713f12' },
  disabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  hint: { color: '#475569', textAlign: 'center', fontSize: 13, lineHeight: 20 },
})
