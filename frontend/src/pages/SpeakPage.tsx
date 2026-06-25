import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Room,
  RoomEvent,
  createLocalAudioTrack,
} from 'livekit-client'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'
import { startTestTone, stopTestTone } from '../lib/testTone'
import { useT } from '../i18n'

type Status = 'idle' | 'connecting' | 'live' | 'error'

export default function SpeakPage() {
  const { channelId } = useParams<{ channelId: string }>()
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const t = useT()

  const roomRef = useRef<Room | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [testing, setTesting] = useState(false)
  const [channelKey, setChannelKey] = useState('')
  const [error, setError] = useState('')

  useEffect(() => () => { roomRef.current?.disconnect(); stopTestTone() }, [])

  async function startStream() {
    if (!token || !channelId) return
    setStatus('connecting')
    setError('')
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(t('speak.micError'))
      }

      const { token: lvToken, channelKey: key } = await api.getChannelToken(
        token, channelId, 'speaker'
      )
      setChannelKey(key)

      const lvUrl = import.meta.env.VITE_LIVEKIT_URL ?? 'ws://localhost:7880'
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      roomRef.current = room

      room.on(RoomEvent.Disconnected, () => setStatus('idle'))

      await room.connect(lvUrl, lvToken)
      const audioTrack = await createLocalAudioTrack()
      await room.localParticipant.publishTrack(audioTrack)

      setStatus('live')
    } catch (err: any) {
      setError(err.message)
      setStatus('error')
    }
  }

  async function stopStream() {
    roomRef.current?.disconnect()
    roomRef.current = null
    setStatus('idle')
  }

  function toggleTest() {
    if (testing) {
      stopTestTone()
      setTesting(false)
    } else {
      startTestTone()
      setTesting(true)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 max-w-sm mx-auto">
      <button
        onClick={() => navigate('/')}
        className="self-start mb-6 text-slate-400 hover:text-white transition"
      >
        {t('app.back')}
      </button>

      <h1 className="text-2xl font-bold mb-2">{t('speak.title')}</h1>
      {channelKey && (
        <p className="text-slate-400 mb-8 font-mono">
          {t('speak.channel')} <span className="text-brand-400 font-bold text-xl">{channelKey}</span>
        </p>
      )}

      {status === 'live' && (
        <div className="flex items-center gap-2 mb-6 bg-green-900/40 text-green-400 px-4 py-2 rounded-full">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          {t('speak.live')}
        </div>
      )}

      {error && (
        <p className="text-red-400 text-sm mb-4 bg-red-950/50 px-4 py-2 rounded-xl">{error}</p>
      )}

      <div className="w-full space-y-4">
        {status !== 'live' ? (
          <button
            onClick={startStream}
            disabled={status === 'connecting'}
            className="w-full py-6 text-xl font-bold rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 transition active:scale-95"
          >
            {status === 'connecting' ? t('speak.connecting') : t('speak.start')}
          </button>
        ) : (
          <button
            onClick={stopStream}
            className="w-full py-6 text-xl font-bold rounded-2xl bg-red-700 hover:bg-red-600 transition active:scale-95"
          >
            {t('speak.stop')}
          </button>
        )}

        <button
          onClick={toggleTest}
          className={`w-full py-5 text-lg font-semibold rounded-2xl transition active:scale-95 ${
            testing
              ? 'bg-yellow-600 hover:bg-yellow-500'
              : 'bg-slate-800 hover:bg-slate-700'
          }`}
        >
          {testing ? t('speak.testStop') : t('speak.testStart')}
        </button>
      </div>

      <p className="text-slate-500 text-xs mt-8 text-center">
        {t('speak.hint')}
      </p>
    </div>
  )
}
