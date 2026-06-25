import { useEffect, useState, useCallback, useRef } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert, AppState, Linking,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../App'
import { api } from '../services/api'
import { useAuthStore } from '../store/auth'
import { useT, getLang } from '../i18n'

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>

export default function DashboardScreen({ navigation }: Props) {
  const { token, user, logout } = useAuthStore()
  const t = useT()
  const lang = getLang()
  const [channels, setChannels] = useState<any[]>([])
  const [newName, setNewName] = useState('')
  const [plan, setPlan] = useState<'3dager' | '14dager'>('3dager')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const appState = useRef(AppState.currentState)
  const awaitingReturn = useRef(false)

  const [pendingInvites, setPendingInvites] = useState<any[]>([])
  const [sharedChannels, setSharedChannels] = useState<any[]>([])
  const [inviteChannelId, setInviteChannelId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')

  const loadChannels = useCallback(async () => {
    if (!token) return
    try {
      const data = await api.getChannels(token)
      setChannels(data)
    } catch {}
    setLoading(false)
  }, [token])

  const loadInvites = useCallback(async () => {
    if (!token) return
    try {
      const res = await api.getInvites(token)
      setPendingInvites(res.pending)
      setSharedChannels(res.shared)
    } catch {}
  }, [token])

  useEffect(() => {
    loadChannels()
    loadInvites()
  }, [loadChannels, loadInvites])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        if (awaitingReturn.current) {
          awaitingReturn.current = false
          loadChannels()
        }
      }
      appState.current = next
    })
    return () => sub.remove()
  }, [loadChannels])

  async function createChannel() {
    if (!token || !newName.trim()) return
    setCreating(true)
    try {
      const res = await api.createChannelWithPlan(token, newName.trim(), plan)
      if (res.adminBypass && res.channel) {
        setChannels((prev) => [res.channel, ...prev])
        setNewName('')
      } else if (res.url) {
        awaitingReturn.current = true
        await Linking.openURL(res.url)
        setNewName('')
      }
    } catch (err: any) {
      Alert.alert(t('dashboard.error'), err.message)
    }
    setCreating(false)
  }

  async function deleteChannel(id: string, name: string) {
    if (!token) return
    Alert.alert(
      t('dashboard.deleteTitle'),
      t('dashboard.deleteConfirm').replace('{name}', name),
      [
        { text: t('invite.cancel'), style: 'cancel' },
        {
          text: '🗑️ Slett', style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteChannel(token, id)
              setChannels((prev) => prev.filter((c: any) => c.id !== id))
            } catch (err: any) {
              Alert.alert(t('dashboard.error'), err.message)
            }
          },
        },
      ]
    )
  }

  async function sendInvite() {
    if (!token || !inviteChannelId || !inviteEmail.trim()) return
    setInviteStatus('sending')
    try {
      await api.inviteSpeaker(token, inviteChannelId, inviteEmail.trim())
      setInviteStatus('ok')
      setInviteEmail('')
    } catch (err: any) {
      Alert.alert(t('dashboard.error'), err.message)
      setInviteStatus('idle')
    }
  }

  async function acceptInvite(inviteId: string) {
    if (!token) return
    try {
      await api.acceptInvite(token, inviteId)
      loadInvites()
    } catch (err: any) {
      Alert.alert(t('dashboard.error'), err.message)
    }
  }

  function openInviteForm(channelId: string) {
    setInviteChannelId(channelId)
    setInviteEmail('')
    setInviteStatus('idle')
  }

  function closeInviteForm() {
    setInviteChannelId(null)
    setInviteEmail('')
    setInviteStatus('idle')
  }

  function expiryLabel(ch: any): string | null {
    if (!ch.expiresAt) return null
    const dato = new Date(ch.expiresAt)
    const locale = lang === 'en' ? 'en-GB' : 'nb-NO'
    return `${t('dashboard.expires')} ${dato.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}`
  }

  const planOptions: Array<{ value: '3dager' | '14dager'; label: string; pris: string }> = [
    { value: '3dager',  label: t('plan.days3'),  pris: t('plan.price3') },
    { value: '14dager', label: t('plan.days14'), pris: t('plan.price14') },
  ]

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <Text style={s.userEmail}>{user?.email}</Text>
        <View style={s.headerBtns}>
          <TouchableOpacity style={s.helpBtn} onPress={() => navigation.navigate('Help')}>
            <Text style={s.helpBtnText}>?</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.logoutBtn} onPress={logout}>
            <Text style={s.logoutBtnText}>{t('auth.logout')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={s.listenHero} onPress={() => navigation.navigate('Listen')} activeOpacity={0.85}>
        <Text style={s.listenHeroIcon}>🎧</Text>
        <Text style={s.listenHeroText}>{t('dashboard.listen')}</Text>
        <Text style={s.listenHeroSub}>{t('dashboard.listenSub')}</Text>
      </TouchableOpacity>

      <View style={s.createSection}>
        <Text style={s.sectionTitle}>{t('dashboard.newChannel')}</Text>
        <TextInput
          style={s.input}
          placeholder={t('dashboard.channelName')}
          placeholderTextColor="#64748b"
          value={newName}
          onChangeText={setNewName}
        />
        <View style={s.planRow}>
          {planOptions.map(({ value, label, pris }) => (
            <TouchableOpacity
              key={value}
              style={[s.planBtn, plan === value && s.planBtnActive]}
              onPress={() => setPlan(value)}
              activeOpacity={0.8}
            >
              <Text style={[s.planBtnLabel, plan === value && s.planBtnLabelActive]}>{label}</Text>
              <Text style={[s.planBtnPris, plan === value && s.planBtnPrisActive]}>{pris}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[s.createBtn, (!newName.trim() || creating) && s.disabled]}
          onPress={createChannel}
          disabled={!newName.trim() || creating}
          activeOpacity={0.85}
        >
          {creating
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.createBtnText}>{t('dashboard.createAndPay')}</Text>
          }
        </TouchableOpacity>
      </View>

      <Text style={s.sectionTitle}>{t('dashboard.myChannels')}</Text>
      {loading ? (
        <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />
      ) : channels.length === 0 ? (
        <Text style={s.empty}>{t('dashboard.noChannels')}</Text>
      ) : (
        <View style={s.list}>
          {channels.map((item) => (
            <View key={item.id} style={s.card}>
              <TouchableOpacity
                style={s.cardMain}
                onPress={() => navigation.navigate('Speak', {
                  channelId: item.id,
                  channelName: item.name,
                  channelKey: item.channelKey,
                })}
                activeOpacity={0.85}
              >
                <View style={s.cardLeft}>
                  <Text style={s.cardName}>{item.name}</Text>
                  <Text style={s.cardKey}>ID: {item.channelKey}</Text>
                  {expiryLabel(item) && (
                    <Text style={s.cardExpiry}>{expiryLabel(item)}</Text>
                  )}
                </View>
                <View style={s.cardActions}>
                  <View style={s.speakBtnWrap}>
                    <Text style={s.speakBtnText}>🎙️{'\n'}{t('dashboard.send')}</Text>
                  </View>
                  <TouchableOpacity
                    style={s.inviteBtn}
                    onPress={() => inviteChannelId === item.id ? closeInviteForm() : openInviteForm(item.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.inviteBtnText}>👤+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={s.deleteBtn}
                    onPress={() => deleteChannel(item.id, item.name)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {inviteChannelId === item.id && (
                <View style={s.inviteForm}>
                  <TextInput
                    style={s.inviteInput}
                    placeholder={t('invite.emailPlaceholder')}
                    placeholderTextColor="#64748b"
                    value={inviteEmail}
                    onChangeText={(v) => { setInviteEmail(v); setInviteStatus('idle') }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {inviteStatus === 'ok' && (
                    <Text style={s.inviteOk}>{t('invite.ok')}</Text>
                  )}
                  <View style={s.inviteRow}>
                    <TouchableOpacity
                      style={[s.inviteSendBtn, (inviteStatus === 'sending' || !inviteEmail.trim()) && s.disabled]}
                      onPress={sendInvite}
                      disabled={inviteStatus === 'sending' || !inviteEmail.trim()}
                      activeOpacity={0.85}
                    >
                      <Text style={s.inviteSendBtnText}>
                        {inviteStatus === 'sending' ? t('invite.sending') : t('invite.send')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.inviteCancelBtn} onPress={closeInviteForm} activeOpacity={0.8}>
                      <Text style={s.inviteCancelBtnText}>{t('invite.cancel')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {pendingInvites.length > 0 && (
        <View style={s.extraSection}>
          <Text style={s.sectionTitle}>{t('invite.pendingTitle')}</Text>
          <View style={s.list}>
            {pendingInvites.map((inv) => (
              <View key={inv.id} style={[s.card, s.inviteCard]}>
                <View style={s.cardLeft}>
                  <Text style={s.cardName}>{inv.channelName}</Text>
                  <Text style={s.cardExpiry}>{t('invite.invitedBy')} {inv.ownerEmail}</Text>
                </View>
                <TouchableOpacity
                  style={s.acceptBtn}
                  onPress={() => acceptInvite(inv.id)}
                  activeOpacity={0.85}
                >
                  <Text style={s.acceptBtnText}>{t('invite.accept')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {sharedChannels.length > 0 && (
        <View style={s.extraSection}>
          <Text style={s.sectionTitle}>{t('invite.sharedTitle')}</Text>
          <View style={s.list}>
            {sharedChannels.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={s.card}
                onPress={() => navigation.navigate('Speak', {
                  channelId: item.id,
                  channelName: item.name,
                  channelKey: item.channelKey,
                })}
                activeOpacity={0.85}
              >
                <View style={s.cardLeft}>
                  <Text style={s.cardName}>{item.name}</Text>
                  <Text style={s.cardKey}>ID: {item.channelKey}</Text>
                </View>
                <View style={s.speakBtnWrap}>
                  <Text style={s.speakBtnText}>🎙️{'\n'}{t('dashboard.send')}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  userEmail: { color: '#64748b', fontSize: 13 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  helpBtn: { backgroundColor: '#1e293b', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  helpBtnText: { color: '#94a3b8', fontWeight: '700', fontSize: 15 },
  logoutBtn: { backgroundColor: '#1e293b', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  logoutBtnText: { color: '#94a3b8', fontWeight: '600' },
  listenHero: {
    backgroundColor: '#0284c7', borderRadius: 20, paddingVertical: 28,
    alignItems: 'center', marginBottom: 20,
    shadowColor: '#0284c7', shadowOpacity: 0.35, shadowRadius: 16, elevation: 6,
  },
  listenHeroIcon: { fontSize: 44, marginBottom: 4 },
  listenHeroText: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  listenHeroSub: { color: '#bae6fd', fontSize: 14, marginTop: 2 },
  createSection: { marginBottom: 20 },
  sectionTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '600', marginBottom: 10 },
  input: { backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#f1f5f9', fontSize: 16, marginBottom: 10 },
  planRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  planBtn: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155', paddingVertical: 12, alignItems: 'center' },
  planBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  planBtnLabel: { color: '#94a3b8', fontWeight: '600', fontSize: 14 },
  planBtnLabelActive: { color: '#fff' },
  planBtnPris: { color: '#475569', fontSize: 13, marginTop: 2 },
  planBtnPrisActive: { color: '#bae6fd' },
  createBtn: { backgroundColor: '#0284c7', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.4 },
  empty: { color: '#475569', textAlign: 'center', marginTop: 60, fontSize: 15 },
  list: { gap: 12 },
  card: {
    backgroundColor: '#0f172a', borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: '#1e293b',
  },
  cardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inviteCard: { borderColor: '#1e3a5f' },
  cardLeft: { flex: 1 },
  cardName: { color: '#f1f5f9', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  cardKey: { color: '#38bdf8', fontFamily: 'monospace', fontSize: 14 },
  cardExpiry: { color: '#475569', fontSize: 12, marginTop: 3 },
  cardActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  speakBtnWrap: { backgroundColor: '#0284c7', borderRadius: 14, width: 64, height: 64, justifyContent: 'center', alignItems: 'center' },
  speakBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12, textAlign: 'center' },
  inviteBtn: { backgroundColor: '#1e293b', borderRadius: 12, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { backgroundColor: '#1e293b', borderRadius: 12, width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { color: '#94a3b8', fontSize: 16 },
  inviteBtnText: { fontSize: 18 },
  inviteForm: { marginTop: 14, gap: 8 },
  inviteInput: { backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, color: '#f1f5f9', fontSize: 15 },
  inviteOk: { color: '#4ade80', fontSize: 14 },
  inviteRow: { flexDirection: 'row', gap: 8 },
  inviteSendBtn: { flex: 1, backgroundColor: '#0284c7', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  inviteSendBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  inviteCancelBtn: { backgroundColor: '#1e293b', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  inviteCancelBtnText: { color: '#94a3b8', fontSize: 14 },
  acceptBtn: { backgroundColor: '#0284c7', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  extraSection: { marginTop: 24 },
})
