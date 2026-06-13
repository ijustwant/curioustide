import { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { Room, RoomEvent, Track } from '@livekit/react-native'
import type { StackScreenProps } from '@react-navigation/stack'
import type { RootStackParamList } from '../App'
import { api } from '../services/api'
import { useAuthStore } from '../store/auth'

type Props = StackScreenProps<RootStackParamList, 'Listen'>
type Status = 'idle' | 'connecting' | 'listening'

const LIVEKIT_URL = __DEV__ ? 'ws://192.168.50.10:7880' : 'wss://your-domain.com/livekit'

export default function ListenScreen({ navigation }: Props) {
  const token = useAuthStore((s) => s.token)
  const roomRef = useRef<Room | null>(null)
  const [key, setKey] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [channelName, setChannelName] = useState('')

  useEffect(() => () => { roomRef.current?.disconnect() }, [])

  async function join() {
    if (!token || !key.trim()) return
    setStatus('connecting')
    try {
      const res = await api.joinByKey(token, key.trim())
      setChannelName(res.channelName)

      const room = new Room()
      roomRef.current = room
      room.on(RoomEvent.Disconnected, () => { setStatus('idle'); setChannelName('') })

      await room.connect(LIVEKIT_URL, res.token)
      setStatus('listening')
    } catch (err: any) {
      Alert.alert('Feil', err.message)
      setStatus('idle')
    }
  }

  function leave() {
    roomRef.current?.disconnect()
    roomRef.current = null
    setStatus('idle')
    setChannelName('')
  }

  return (
    <View style={s.root}>
      {status === 'idle' ? (
        <>
          <Text style={s.label}>Kanal-ID</Text>
          <TextInput
            style={s.keyInput}
            placeholder="F.eks. ABC123"
            placeholderTextColor="#475569"
            value={key}
            onChangeText={(t) => setKey(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={8}
            keyboardType="visible-password"
          />
          <TouchableOpacity
            style={[s.btn, s.joinBtn, !key.trim() && s.disabled]}
            onPress={join}
            disabled={!key.trim()}
            activeOpacity={0.8}
          >
            <Text style={s.btnText}>🎧  Koble til</Text>
          </TouchableOpacity>
        </>
      ) : status === 'connecting' ? (
        <Text style={s.connectingText}>Kobler til...</Text>
      ) : (
        <>
          <View style={s.listeningBadge}>
            <View style={s.dot} />
            <Text style={s.listeningText}>Lytter til</Text>
          </View>
          <Text style={s.listeningChannel}>{channelName}</Text>
          <TouchableOpacity style={[s.btn, s.leaveBtn]} onPress={leave} activeOpacity={0.8}>
            <Text style={s.btnText}>⏹  Koble fra</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617', alignItems: 'center', justifyContent: 'center', padding: 24 },
  label: { color: '#64748b', fontSize: 14, marginBottom: 12, fontWeight: '600' },
  keyInput: {
    backgroundColor: '#1e293b', borderRadius: 18, paddingVertical: 18, paddingHorizontal: 24,
    color: '#38bdf8', fontSize: 36, fontWeight: 'bold', letterSpacing: 8, textAlign: 'center',
    width: '100%', marginBottom: 20, fontFamily: 'monospace',
  },
  btn: { width: '100%', borderRadius: 20, paddingVertical: 22, alignItems: 'center' },
  joinBtn: { backgroundColor: '#0284c7' },
  leaveBtn: { backgroundColor: '#b91c1c', marginTop: 24 },
  disabled: { opacity: 0.4 },
  btnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  connectingText: { color: '#64748b', fontSize: 18 },
  listeningBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0c1a2e', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 20, marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#38bdf8' },
  listeningText: { color: '#38bdf8', fontWeight: '700', fontSize: 16 },
  listeningChannel: { fontSize: 28, fontWeight: 'bold', color: '#f1f5f9', textAlign: 'center', marginBottom: 8 },
})
