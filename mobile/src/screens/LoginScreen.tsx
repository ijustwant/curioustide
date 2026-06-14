import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView,
} from 'react-native'
import { api } from '../services/api'
import { useAuthStore } from '../store/auth'

export default function LoginScreen() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit() {
    setError('')
    setLoading(true)
    try {
      const result =
        mode === 'login'
          ? await api.login(email.trim(), password)
          : await api.register(email.trim(), password, name.trim() || undefined)
      console.log('[Auth] token mottatt:', result.token ? result.token.slice(0, 20) + '...' : 'MANGLER')
      console.log('[Auth] user:', JSON.stringify(result.user))
      setAuth(result.token, result.user)
      console.log('[Auth] setAuth kalt, navigasjon bør skje nå')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
      <Text style={s.logo}>CuriousTide</Text>
      <Text style={s.sub}>Live lyd for arrangementer</Text>

      <View style={s.tabs}>
        {(['login', 'register'] as const).map((m) => (
          <TouchableOpacity key={m} style={[s.tab, mode === m && s.tabActive]} onPress={() => setMode(m)}>
            <Text style={[s.tabText, mode === m && s.tabTextActive]}>
              {m === 'login' ? 'Logg inn' : 'Registrer'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.form}>
        {mode === 'register' && (
          <TextInput
            style={s.input}
            placeholder="Navn (valgfritt)"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
          />
        )}
        <TextInput
          style={s.input}
          placeholder="E-post"
          placeholderTextColor="#64748b"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={s.input}
          placeholder="Passord"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? (
          <ScrollView style={s.errorBox} nestedScrollEnabled>
            <Text style={s.error}>{error}</Text>
          </ScrollView>
        ) : null}

        <TouchableOpacity style={s.btn} onPress={submit} disabled={loading} activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.btnText}>{mode === 'login' ? 'Logg inn' : 'Opprett konto'}</Text>
          )}
        </TouchableOpacity>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  logo: { fontSize: 32, fontWeight: 'bold', color: '#38bdf8', marginBottom: 4 },
  sub: { fontSize: 14, color: '#64748b', marginBottom: 32 },
  tabs: { flexDirection: 'row', backgroundColor: '#1e293b', borderRadius: 14, padding: 4, marginBottom: 20, width: '100%' },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#0284c7' },
  tabText: { color: '#94a3b8', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  form: { width: '100%', gap: 12 },
  input: {
    backgroundColor: '#1e293b', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    color: '#f1f5f9', fontSize: 16, borderWidth: 1, borderColor: '#334155',
  },
  errorBox: { maxHeight: 120, backgroundColor: '#450a0a', borderRadius: 10 },
  error: { color: '#f87171', padding: 12, fontFamily: 'monospace', fontSize: 12 },
  btn: { backgroundColor: '#0284c7', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
})
