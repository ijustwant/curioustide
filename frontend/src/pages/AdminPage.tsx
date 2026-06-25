import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'

const ADMIN_EMAIL = 'tommylarsen40@gmail.com'

type User = {
  id: string
  email: string
  name: string | null
  createdAt: string
  channels: number
}

type Channel = {
  id: string
  name: string
  channelKey: string
  plan: string | null
  expiresAt: string | null
  createdAt: string
}

export default function AdminPage() {
  const navigate = useNavigate()
  const { token, user } = useAuthStore()
  const [users, setUsers] = useState<User[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [channels, setChannels] = useState<Record<string, Channel[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token || user?.email !== ADMIN_EMAIL) {
      navigate('/')
      return
    }
    api.adminGetUsers(token).then((data) => {
      setUsers(data)
      setLoading(false)
    })
  }, [token])

  async function toggleExpand(userId: string) {
    if (expanded === userId) { setExpanded(null); return }
    setExpanded(userId)
    if (!channels[userId]) {
      const data = await api.adminGetChannels(token!, userId)
      setChannels((prev) => ({ ...prev, [userId]: data }))
    }
  }

  async function deleteUser(userId: string, email: string) {
    if (!confirm(`Slett bruker ${email}? Alle kanaler slettes også.`)) return
    await api.adminDeleteUser(token!, userId)
    setUsers((prev) => prev.filter((u) => u.id !== userId))
    if (expanded === userId) setExpanded(null)
  }

  async function deleteChannel(userId: string, channelId: string) {
    if (!confirm('Slett denne kanalen?')) return
    await api.adminDeleteChannel(token!, userId, channelId)
    setChannels((prev) => ({
      ...prev,
      [userId]: (prev[userId] ?? []).filter((c) => c.id !== channelId),
    }))
    setUsers((prev) => prev.map((u) =>
      u.id === userId ? { ...u, channels: u.channels - 1 } : u
    ))
  }

  if (!token || user?.email !== ADMIN_EMAIL) return null

  return (
    <div className="min-h-screen px-4 py-6 max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-400">Admin</h1>
          <p className="text-slate-400 text-sm">CuriousTide brukeradministrasjon</p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium transition"
        >
          ← Tilbake
        </button>
      </header>

      {loading ? (
        <p className="text-slate-400">Laster...</p>
      ) : (
        <div className="space-y-3">
          <p className="text-slate-500 text-sm mb-4">{users.length} brukere totalt</p>
          {users.map((u) => (
            <div key={u.id} className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{u.email}</span>
                    {u.email === ADMIN_EMAIL && (
                      <span className="text-xs bg-brand-900 text-brand-300 px-2 py-0.5 rounded-full">admin</span>
                    )}
                  </div>
                  {u.name && <p className="text-slate-400 text-sm">{u.name}</p>}
                  <p className="text-slate-500 text-xs mt-0.5">
                    {u.channels} kanal{u.channels !== 1 ? 'er' : ''} · registrert {new Date(u.createdAt).toLocaleDateString('nb-NO')}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {u.channels > 0 && (
                    <button
                      onClick={() => toggleExpand(u.id)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm transition"
                    >
                      {expanded === u.id ? '▲' : '▼'} Kanaler
                    </button>
                  )}
                  {u.email !== ADMIN_EMAIL && (
                    <button
                      onClick={() => deleteUser(u.id, u.email)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-900 text-sm transition"
                    >
                      Slett
                    </button>
                  )}
                </div>
              </div>

              {expanded === u.id && (
                <div className="border-t border-slate-800 bg-slate-950 divide-y divide-slate-800">
                  {(channels[u.id] ?? []).length === 0 ? (
                    <p className="text-slate-500 text-sm px-4 py-3">Ingen kanaler</p>
                  ) : (
                    (channels[u.id] ?? []).map((ch) => (
                      <div key={ch.id} className="px-4 py-3 flex items-center justify-between gap-4">
                        <div>
                          <span className="font-medium text-sm">{ch.name}</span>
                          <span className="text-brand-400 font-mono text-xs ml-2">{ch.channelKey}</span>
                          {ch.plan && (
                            <span className="text-slate-500 text-xs ml-2">
                              {ch.plan}{ch.expiresAt ? ` · utløper ${new Date(ch.expiresAt).toLocaleDateString('nb-NO')}` : ''}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => deleteChannel(u.id, ch.id)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900 text-xs transition shrink-0"
                        >
                          Slett
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
