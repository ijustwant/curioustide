import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../App'
import { api } from '../services/api'
import { useAuthStore } from '../store/auth'

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>

export default function DashboardScreen({ navigation }: Props) {
  const { token, user, logout } = useAuthStore()
  const [channels, setChannels] = useState<any[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  const loadChannels = useCallback(async () => {
    if (!token) return
    try {
      const data = await api.getChannels(token)
      setChannels(data)
    } catch {}
    setLoading(false)
  }, [token])

  useEffect(() => { loadChannels() }, [loadChannels])

  async function createChannel() {
    if (!token || !newName.trim()) return
    setCreating(true)
    try {
      const ch = await api.createChannel(token, newName.trim())
      setChannels((prev) => [ch, ...prev])
      setNewName('')
    } catch (err: any) {
      Alert.alert('Feil', err.message)
    }
    setCreating(false)
  }

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.userEmail}>{user?.email}</Text>
        <View style={s.headerBtns}>
          <TouchableOpacity style={s.listenBtn} onPress={() => navigation.navigate('Listen')}>
            <Text style={s.listenBtnText}>🎧 Lytt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.logoutBtn} onPress={logout}>
            <Text style={s.logoutBtnText}>Logg ut</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.createRow}>
        <TextInput
          style={s.input}
          placeholder="Ny kanal..."
          placeholderTextColor="#64748b"
          value={newName}
          onChangeText={setNewName}
        />
        <TouchableOpacity
          style={[s.createBtn, (!newName.trim() || creating) && s.disabled]}
          onPress={createChannel}
          disabled={!newName.trim() || creating}
        >
          {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.createBtnText}>+</Text>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />
      ) : channels.length === 0 ? (
        <Text style={s.empty}>Ingen kanaler ennå. Opprett en ovenfor.</Text>
      ) : (
        <FlatList
          data={channels}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 12, paddingVertical: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.card}
              onPress={() =>
                navigation.navigate('Speak', {
                  channelId: item.id,
                  channelName: item.name,
                  channelKey: item.channelKey,
                })
              }
              activeOpacity={0.85}
            >
              <View style={s.cardLeft}>
                <Text style={s.cardName}>{item.name}</Text>
                <Text style={s.cardKey}>ID: {item.channelKey}</Text>
              </View>
              <View style={s.speakBtnWrap}>
                <Text style={s.speakBtnText}>🎙️{'\n'}Send</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617', paddingHorizontal: 16, paddingTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  userEmail: { color: '#64748b', fontSize: 13 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  listenBtn: { backgroundColor: '#1e293b', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  listenBtnText: { color: '#f1f5f9', fontWeight: '600' },
  logoutBtn: { backgroundColor: '#1e293b', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  logoutBtnText: { color: '#94a3b8', fontWeight: '600' },
  createRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  input: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#f1f5f9', fontSize: 16 },
  createBtn: { backgroundColor: '#0284c7', borderRadius: 12, width: 48, justifyContent: 'center', alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 28, fontWeight: 'bold', lineHeight: 32 },
  disabled: { opacity: 0.4 },
  empty: { color: '#475569', textAlign: 'center', marginTop: 60, fontSize: 15 },
  card: {
    backgroundColor: '#0f172a', borderRadius: 18, padding: 18,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#1e293b',
  },
  cardLeft: { flex: 1 },
  cardName: { color: '#f1f5f9', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  cardKey: { color: '#38bdf8', fontFamily: 'monospace', fontSize: 14 },
  speakBtnWrap: { backgroundColor: '#0284c7', borderRadius: 14, width: 64, height: 64, justifyContent: 'center', alignItems: 'center' },
  speakBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
})
