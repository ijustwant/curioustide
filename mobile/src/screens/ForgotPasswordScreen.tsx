import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../App'
import { api } from '../services/api'
import { useT } from '../i18n'

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>

export default function ForgotPasswordScreen({ navigation }: Props) {
  const t = useT()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit() {
    if (!email.trim()) return
    setLoading(true)
    try {
      await api.forgotPassword(email.trim())
      setSent(true)
    } catch {}
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.inner}>
        <Text style={s.logo}>CuriousTide</Text>
        <Text style={s.title}>{t('auth.forgotPasswordTitle')}</Text>

        {sent ? (
          <>
            <View style={s.successBox}>
              <Text style={s.successText}>{t('auth.resetEmailSent')}</Text>
            </View>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={s.backBtnText}>{t('auth.backToLogin')}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={s.sub}>{t('auth.forgotPasswordSub')}</Text>
            <TextInput
              style={s.input}
              placeholder={t('auth.email')}
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <TouchableOpacity
              style={[s.btn, (!email.trim() || loading) && s.disabled]}
              onPress={submit}
              disabled={!email.trim() || loading}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.btnText}>{t('auth.sendResetLink')}</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.navigate('Login')}>
              <Text style={s.backBtnText}>← {t('auth.backToLogin')}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  inner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  logo: { fontSize: 32, fontWeight: 'bold', color: '#38bdf8', marginBottom: 4 },
  title: { fontSize: 18, color: '#94a3b8', marginBottom: 28 },
  sub: { color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  input: {
    width: '100%', backgroundColor: '#1e293b', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14, color: '#f1f5f9',
    fontSize: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 12,
  },
  btn: { width: '100%', backgroundColor: '#0284c7', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  disabled: { opacity: 0.4 },
  backBtn: { marginTop: 20 },
  backBtnText: { color: '#475569', fontSize: 14 },
  successBox: { backgroundColor: '#052e16', borderRadius: 14, padding: 18, marginBottom: 24, width: '100%' },
  successText: { color: '#4ade80', fontSize: 14, lineHeight: 22, textAlign: 'center' },
})
