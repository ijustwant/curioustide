import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Room, RoomEvent, RemoteTrack, Track } from 'livekit-client'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'

type Status = 'idle' | 'connecting' | 'listening' | 'error'

export default function ListenPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)

  const roomRef = useRef<Room | null>(null)
  const [key, setKey] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [channelName, setChannelName] = useState('')
  const [error, setError] = useState('')
  const audioContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => () => { roomRef.current?.disconnect() }, [])

  async function join() {
    if (!token || !key.trim()) return
    setStatus('connecting')
    setError('')
    try {
      const res = await api.joinByKey(token, key.trim())
      setChannelName(res.channelName)

      const lvUrl = import.meta.env.VITE_LIVEKIT_URL ?? 'ws://localhost:7880'
      const room = new Room({ adaptiveStream: true })
      roomRef.current = room

      room.on(RoomEvent.Disconnected, () => setStatus('idle'))
      room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          const el = track.attach()
          el.autoplay = true
          audioContainerRef.current?.appendChild(el)
        }
      })
      room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach().forEach((el) => el.remove())
      })

      await room.connect(lvUrl, res.token)
      setStatus('listening')
    } catch (err: any) {
      setError(err.message)
      setStatus('error')
    }
  }

  function leave() {
    roomRef.current?.disconnect()
    roomRef.current = null
    audioContainerRef.current?.replaceChildren()
    setStatus('idle')
    setChannelName('')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 max-w-sm mx-auto">
      <button
        onClick={() => navigate('/')}
        className="self-start mb-6 text-slate-400 hover:text-white transition"
      >
        ← Tilbake
      </button>

      <h1 className="text-2xl font-bold mb-8">🎧 Lytt</h1>

      {status === 'idle' || status === 'error' ? (
        <div className="w-full space-y-4">
          <input
            type="text"
            placeholder="Tast inn kanal-ID (f.eks. ABC123)"
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            maxLength={8}
            className="w-full px-4 py-4 text-center text-2xl font-mono tracking-widest rounded-2xl bg-slate-800 border border-slate-700 focus:border-brand-500 focus:outline-none uppercase"
          />
          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
          <button
            onClick={join}
            disabled={!key.trim()}
            className="w-full py-5 text-xl font-bold rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 transition active:scale-95"
          >
            🎧 Koble til
          </button>
        </div>
      ) : (
        <div className="w-full space-y-6 text-center">
          {status === 'connecting' ? (
            <p className="text-slate-400 text-lg">Kobler til...</p>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 bg-brand-900/40 text-brand-400 px-4 py-3 rounded-full">
                <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                Lytter til: <span className="font-bold ml-1">{channelName}</span>
              </div>
              <div ref={audioContainerRef} className="hidden" />
              <button
                onClick={leave}
                className="w-full py-5 text-xl font-bold rounded-2xl bg-red-700 hover:bg-red-600 transition active:scale-95"
              >
                ⏹ Koble fra
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
