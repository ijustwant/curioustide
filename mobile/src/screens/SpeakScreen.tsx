import { useEffect, useRef, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native'
import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'
import { Room, RoomEvent, createLocalAudioTrack } from 'livekit-client'
import { AudioSession } from '@livekit/react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../App'
import { api, type InterviewClip } from '../services/api'
import { useAuthStore } from '../store/auth'
import { useT } from '../i18n'
import { startBroadcastForegroundService, stopBroadcastForegroundService } from '../lib/foregroundAudioService'
import AudioDevicePicker, { type AudioDevice } from '../../modules/audio-device-picker'

type Props = NativeStackScreenProps<RootStackParamList, 'Speak'>
type Status = 'idle' | 'connecting' | 'live' | 'error'

const LIVEKIT_URL = __DEV__ ? 'ws://192.168.50.10:7880' : 'wss://curioustide.no/livekit'

// Lyttere kobler til med identity `${sub}:lst:${timestamp}` (se channels.ts) — skiller dem fra medtalere (`${sub}:spk`).
function isListenerIdentity(identity: string): boolean {
  return identity.includes(':lst:')
}

function countListeners(room: Room): number {
  let n = 0
  room.remoteParticipants.forEach((p) => {
    if (isListenerIdentity(p.identity)) n++
  })
  return n
}

function micTypeIcon(type: AudioDevice['type']): string {
  switch (type) {
    case 'bluetooth': return '🔵'
    case 'usb': return '🔌'
    case 'wired': return '🎧'
    case 'builtin': return '📱'
    default: return '🎙️'
  }
}

export default function SpeakScreen({ route, navigation }: Props) {
  const { channelId, channelName, channelKey } = route.params
  const token = useAuthStore((s) => s.token)
  const t = useT()
  const roomRef = useRef<Room | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [notifyMsg, setNotifyMsg] = useState('')
  const [notifying, setNotifying] = useState(false)
  const recordingRef = useRef<Audio.Recording | null>(null)
  const [clipRecording, setClipRecording] = useState(false)
  const [clipUploading, setClipUploading] = useState(false)
  const [clips, setClips] = useState<InterviewClip[]>([])
  const [editingClipId, setEditingClipId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [playingClipId, setPlayingClipId] = useState<string | null>(null)
  const [playingIngressId, setPlayingIngressId] = useState<string | null>(null)
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasLiveBeforeClipRef = useRef(false)
  const [listenerCount, setListenerCount] = useState(0)
  const [audioInputs, setAudioInputs] = useState<AudioDevice[]>([])
  const [selectedMicId, setSelectedMicId] = useState<number | null>(null)

  function loadAudioInputs() {
    try {
      const inputs = AudioDevicePicker.getAudioInputDevices()
      setAudioInputs(inputs)
      setSelectedMicId((prev) => (prev !== null && inputs.some((d) => d.id === prev) ? prev : null))
    } catch (e) {
      console.warn('[Speak] fant ikke lydenheter:', e)
    }
  }

  useEffect(() => {
    loadAudioInputs()
  }, [])

  useEffect(() => {
    if (!token) return
    const fetchClips = () => {
      api.getClips(token, channelId).then(setClips).catch((e) => console.warn('[clips] henting feilet:', e))
    }
    fetchClips()
    const interval = setInterval(fetchClips, 8000)
    return () => clearInterval(interval)
  }, [token, channelId])

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect()
      stopBroadcastForegroundService()
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current)
    }
  }, [])

  async function startStream() {
    if (!token) return
    setStatus('connecting')
    try {
      await Audio.requestPermissionsAsync()
      loadAudioInputs()
      await AudioSession.startAudioSession()
      try {
        // Sikrer at lydøkten fortsetter i bakgrunnen/med låst skjerm på begge plattformer.
        await AudioSession.configureAudio({
          android: { audioTypeOptions: { audioType: 'communication' } },
          ios: {
            defaultOutput: 'speaker',
            audioCategory: 'playAndRecord',
            categoryOptions: ['allowBluetooth', 'allowBluetoothA2DP', 'defaultToSpeaker'],
            mode: 'videoChat',
          },
        })
      } catch (e) {
        console.warn('[Speak] configureAudio ikke tilgjengelig i denne SDK-versjonen:', e)
      }
      if (selectedMicId !== null) {
        try {
          const ok = AudioDevicePicker.setCommunicationDevice(selectedMicId)
          if (!ok) {
            const device = audioInputs.find((d) => d.id === selectedMicId)
            console.warn('[Speak] Android avviste tvunget mikrofonvalg for id', selectedMicId, device)
            Alert.alert('', t('speak.micForceFailed').replace('{name}', device?.name ?? String(selectedMicId)))
          }
        } catch (e) {
          console.warn('[Speak] klarte ikke å tvinge valgt mikrofon:', e)
        }
      }
      const { token: lvToken } = await api.getChannelToken(token, channelId, 'speaker')

      const room = new Room()
      roomRef.current = room
      room.on(RoomEvent.Disconnected, () => {
        setStatus('idle')
        setListenerCount(0)
      })
      room.on(RoomEvent.ParticipantConnected, () => setListenerCount(countListeners(room)))
      room.on(RoomEvent.ParticipantDisconnected, () => setListenerCount(countListeners(room)))

      await room.connect(LIVEKIT_URL, lvToken)
      const audioTrack = await createLocalAudioTrack({
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      })
      await room.localParticipant.publishTrack(audioTrack)
      await startBroadcastForegroundService(t('speak.notifTitle'), t('speak.notifBody'))
      setListenerCount(countListeners(room))
      setStatus('live')
    } catch (err: any) {
      const msg = err?.message || String(err)
      const stack = err?.stack ? '\n\n' + err.stack.slice(0, 400) : ''
      console.error('[Speak] feil:', msg, err?.stack)
      Alert.alert('Error', msg + stack)
      setStatus('error')
    }
  }

  async function stopStream() {
    roomRef.current?.disconnect()
    roomRef.current = null
    AudioSession.stopAudioSession()
    try {
      AudioDevicePicker.clearCommunicationDevice()
    } catch {
      // Ignorer — enheten støtter kanskje ikke dette (krever Android 12+)
    }
    await stopBroadcastForegroundService()
    setStatus('idle')
    setListenerCount(0)
  }

  async function sendNotification() {
    if (!token || !notifyMsg.trim() || notifying) return
    setNotifying(true)
    try {
      const res = await api.notifyChannel(token, channelId, notifyMsg.trim())
      setNotifyMsg('')
      Alert.alert('', t('speak.notifySent').replace('{n}', String(res.recipients)))
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setNotifying(false)
    }
  }

  async function startInterviewRecording() {
    if (!token || clipRecording) return
    wasLiveBeforeClipRef.current = status === 'live'
    if (status === 'live') await stopStream()

    try {
      await Audio.requestPermissionsAsync()
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      recordingRef.current = recording
      setClipRecording(true)
    } catch (err: any) {
      Alert.alert('Error', err.message)
    }
  }

  async function stopInterviewRecording() {
    if (!token || !recordingRef.current) return
    setClipRecording(false)
    setClipUploading(true)
    try {
      const recording = recordingRef.current
      recordingRef.current = null
      await recording.stopAndUnloadAsync()
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false })
      const uri = recording.getURI()
      const recStatus = await recording.getStatusAsync()
      if (!uri) throw new Error('Fant ikke opptaksfil')

      const { uploadUrl, objectPath } = await api.getClipUploadUrl(token, channelId)
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, { httpMethod: 'PUT' })
      if (uploadResult.status >= 300) throw new Error(`Opplasting feilet (${uploadResult.status})`)

      const now = new Date()
      const defaultName = `Intervju ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      const clip = await api.createClip(token, channelId, objectPath, recStatus.durationMillis, defaultName)
      setClips((prev) => [clip, ...prev])
    } catch (err: any) {
      Alert.alert('Error', err.message)
    } finally {
      setClipUploading(false)
      if (wasLiveBeforeClipRef.current) await startStream()
    }
  }

  async function saveClipName(clipId: string) {
    if (!token || !editName.trim()) return
    try {
      const updated = await api.renameClip(token, channelId, clipId, editName.trim())
      setClips((prev) => prev.map((c) => (c.id === clipId ? updated : c)))
      setEditingClipId(null)
    } catch (err: any) {
      Alert.alert('Error', err.message)
    }
  }

  async function playClip(clip: InterviewClip) {
    if (!token || playingClipId) return
    setPlayingClipId(clip.id)
    try {
      const res = await api.playClip(token, channelId, clip.id)
      setPlayingIngressId(res.ingressId ?? null)
      if (clip.durationMs) {
        playTimeoutRef.current = setTimeout(() => {
          setPlayingClipId(null)
          setPlayingIngressId(null)
        }, clip.durationMs + 1000)
      }
    } catch (err: any) {
      Alert.alert('Error', err.message)
      setPlayingClipId(null)
      setPlayingIngressId(null)
    }
  }

  function confirmDeleteClip(clip: InterviewClip) {
    if (!token) return
    Alert.alert(
      t('speak.clipDeleteTitle'),
      t('speak.clipDeleteConfirm').replace('{name}', clip.name),
      [
        { text: t('invite.cancel'), style: 'cancel' },
        {
          text: t('speak.clipDelete'), style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteClip(token, channelId, clip.id)
              setClips((prev) => prev.filter((c) => c.id !== clip.id))
              if (playingClipId === clip.id) {
                if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current)
                setPlayingClipId(null)
                setPlayingIngressId(null)
              }
            } catch (err: any) {
              Alert.alert('Error', err.message)
            }
          },
        },
      ]
    )
  }

  async function stopPlayingClip() {
    if (!token || !playingClipId || !playingIngressId) return
    if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current)
    const clipId = playingClipId
    const ingressId = playingIngressId
    setPlayingClipId(null)
    setPlayingIngressId(null)
    try {
      await api.stopClip(token, channelId, clipId, ingressId)
    } catch (err: any) {
      Alert.alert('Error', err.message)
    }
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.rootContent}>
      <View style={s.info}>
        <Text style={s.channelName}>{channelName}</Text>
        <View style={s.keyBadge}>
          <Text style={s.keyLabel}>{t('speak.channelId')}</Text>
          <Text style={s.keyValue}>{channelKey}</Text>
        </View>
      </View>

      {status === 'live' && (
        <View style={s.liveBadge}>
          <View style={s.liveDot} />
          <Text style={s.liveText}>{t('speak.live')}</Text>
        </View>
      )}

      {status === 'idle' && audioInputs.length > 1 && (
        <View style={s.micSection}>
          <View style={s.micHeaderRow}>
            <Text style={s.micLabel}>{t('speak.micLabel')}</Text>
            <TouchableOpacity onPress={loadAudioInputs}>
              <Text style={s.micRefresh}>{t('speak.micRefresh')}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.micRow}>
            {audioInputs.map((d) => (
              <TouchableOpacity
                key={d.id}
                style={[s.micChip, (selectedMicId ?? audioInputs[0]?.id) === d.id && s.micChipActive]}
                onPress={() => setSelectedMicId(d.id)}
              >
                <Text
                  style={[s.micChipText, (selectedMicId ?? audioInputs[0]?.id) === d.id && s.micChipTextActive]}
                  numberOfLines={1}
                >
                  {micTypeIcon(d.type)} {d.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
              {status === 'connecting' ? t('speak.connecting') : t('speak.start')}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.btn, s.stopBtn]} onPress={stopStream} activeOpacity={0.8}>
            <Text style={s.btnText}>{t('speak.stop')} <Text style={s.listenerCount}>({listenerCount})</Text></Text>
          </TouchableOpacity>
        )}
      </View>

      {status === 'live' && (
        <View style={s.notifyRow}>
          <TextInput
            style={s.notifyInput}
            placeholder={t('speak.notifyPlaceholder')}
            placeholderTextColor="#475569"
            value={notifyMsg}
            onChangeText={setNotifyMsg}
            maxLength={200}
          />
          <TouchableOpacity
            style={[s.notifyBtn, (!notifyMsg.trim() || notifying) && s.disabled]}
            onPress={sendNotification}
            disabled={!notifyMsg.trim() || notifying}
            activeOpacity={0.8}
          >
            <Text style={s.notifyBtnText}>{notifying ? t('speak.notifySending') : t('speak.notifySend')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s.clipsSection}>
        <Text style={s.clipsTitle}>{t('speak.clipsTitle')}</Text>

        {status === 'live' && !clipRecording && (
          <Text style={s.clipHint}>{t('speak.clipStopsLive')}</Text>
        )}

        <TouchableOpacity
          style={[s.btn, clipRecording ? s.clipStopBtn : s.clipStartBtn, clipUploading && s.disabled]}
          onPress={clipRecording ? stopInterviewRecording : startInterviewRecording}
          disabled={clipUploading}
          activeOpacity={0.8}
        >
          <Text style={s.btnText}>
            {clipUploading ? t('speak.clipUploading') : clipRecording ? t('speak.clipStop') : t('speak.clipStart')}
          </Text>
        </TouchableOpacity>
        {clipRecording && <Text style={s.clipRecordingText}>{t('speak.clipRecording')}</Text>}

        {clips.length === 0 ? (
          <Text style={s.clipHint}>{t('speak.clipEmpty')}</Text>
        ) : (
          <View style={s.clipList}>
            {clips.map((clip) => (
              <View key={clip.id} style={s.clipRow}>
                {editingClipId === clip.id ? (
                  <>
                    <TextInput
                      style={s.clipNameInput}
                      value={editName}
                      onChangeText={setEditName}
                      maxLength={100}
                      autoFocus
                    />
                    <TouchableOpacity onPress={() => saveClipName(clip.id)}>
                      <Text style={s.clipAction}>{t('speak.clipRename')}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={s.clipNameWrap}
                      onPress={() => { setEditingClipId(clip.id); setEditName(clip.name) }}
                    >
                      <Text style={s.clipName} numberOfLines={1}>{clip.name}</Text>
                    </TouchableOpacity>
                    {playingClipId === clip.id ? (
                      <TouchableOpacity onPress={stopPlayingClip}>
                        <Text style={s.clipStopAction}>{t('speak.clipStopPlaying')}</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => playClip(clip)} disabled={!!playingClipId}>
                        <Text style={[s.clipAction, !!playingClipId && s.clipActionDisabled]}>
                          {t('speak.clipPlay')}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => confirmDeleteClip(clip)} style={s.clipDeleteBtn}>
                      <Text style={s.clipDeleteAction}>✕</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      <Text style={s.hint}>{t('speak.hint')}</Text>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#020617' },
  rootContent: { alignItems: 'center', padding: 24, flexGrow: 1, justifyContent: 'center' },
  info: { alignItems: 'center', marginBottom: 32 },
  channelName: { fontSize: 24, fontWeight: 'bold', color: '#f1f5f9', marginBottom: 12 },
  keyBadge: { backgroundColor: '#0f172a', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 24, borderWidth: 1, borderColor: '#1e293b', alignItems: 'center' },
  keyLabel: { color: '#64748b', fontSize: 12, marginBottom: 2 },
  keyValue: { color: '#38bdf8', fontSize: 28, fontWeight: 'bold', fontFamily: 'monospace', letterSpacing: 4 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#052e16', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 20, marginBottom: 24 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4ade80' },
  liveText: { color: '#4ade80', fontWeight: '700', fontSize: 16 },
  micSection: { width: '100%', marginBottom: 20 },
  micHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  micLabel: { color: '#64748b', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  micRefresh: { color: '#38bdf8', fontSize: 12, fontWeight: '700' },
  micRow: { flexGrow: 0 },
  micChip: {
    backgroundColor: '#0f172a', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#1e293b', marginRight: 8, maxWidth: 180,
  },
  micChipActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  micChipText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  micChipTextActive: { color: '#fff' },
  buttons: { width: '100%', gap: 16, marginBottom: 32 },
  btn: { borderRadius: 20, paddingVertical: 22, alignItems: 'center', justifyContent: 'center' },
  startBtn: { backgroundColor: '#0284c7' },
  stopBtn: { backgroundColor: '#b91c1c' },
  disabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  listenerCount: { fontSize: 16, fontWeight: '600', opacity: 0.85 },
  hint: { color: '#475569', textAlign: 'center', fontSize: 13, lineHeight: 20 },
  notifyRow: { width: '100%', gap: 10, marginBottom: 24 },
  notifyInput: {
    backgroundColor: '#0f172a', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    color: '#f1f5f9', fontSize: 15, borderWidth: 1, borderColor: '#1e293b',
  },
  notifyBtn: { backgroundColor: '#334155', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  notifyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  clipsSection: { width: '100%', marginTop: 8, marginBottom: 24 },
  clipsTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  clipHint: { color: '#475569', fontSize: 12, marginBottom: 10, lineHeight: 18 },
  clipStartBtn: { backgroundColor: '#1e293b', paddingVertical: 16 },
  clipStopBtn: { backgroundColor: '#b91c1c', paddingVertical: 16 },
  clipRecordingText: { color: '#f87171', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  clipList: { marginTop: 12, gap: 8 },
  clipRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0f172a', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: '#1e293b', gap: 10,
  },
  clipNameWrap: { flex: 1 },
  clipName: { color: '#e2e8f0', fontSize: 14 },
  clipNameInput: {
    flex: 1, color: '#f1f5f9', fontSize: 14, backgroundColor: '#1e293b', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  clipAction: { color: '#38bdf8', fontSize: 13, fontWeight: '700' },
  clipActionDisabled: { opacity: 0.4 },
  clipStopAction: { color: '#f87171', fontSize: 13, fontWeight: '700' },
  clipDeleteBtn: { paddingLeft: 4 },
  clipDeleteAction: { color: '#64748b', fontSize: 16, fontWeight: '700' },
})
