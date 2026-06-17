import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { token, user, logout } = useAuthStore()
  const [channels, setChannels] = useState<any[]>([])
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (token) api.getChannels(token).then(setChannels).catch(console.error)
  }, [token])

  async function createChannel(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !newName.trim()) return
    setCreating(true)
    setError('')
    try {
      const ch = await api.createChannel(token, newName.trim())
      setChannels((prev) => [ch, ...prev])
      setNewName('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function deleteChannel(id: string) {
    if (!token) return
    await api.deleteChannel(token, id)
    setChannels((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-brand-400">CuriousTide</h1>
          <p className="text-slate-400 text-sm">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-red-900 text-sm font-medium transition"
        >
          Logg ut
        </button>
      </header>

      <button
        onClick={() => navigate('/listen')}
        className="w-full mb-8 py-6 rounded-2xl bg-brand-600 hover:bg-brand-500 active:scale-[.98] transition-all flex flex-col items-center gap-1 shadow-lg shadow-brand-900/40"
      >
        <span className="text-4xl">🎧</span>
        <span className="text-2xl font-bold tracking-wide">Lytt</span>
        <span className="text-brand-200 text-sm">Koble til en kanal og lytt</span>
      </button>

      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Ny kanal</h2>
        <form onSubmit={createChannel} className="flex gap-2">
          <input
            type="text"
            placeholder="Navn på kanal"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-brand-500 focus:outline-none transition"
          />
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 font-semibold transition"
          >
            Opprett
          </button>
        </form>
        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Mine kanaler</h2>
        {channels.length === 0 ? (
          <p className="text-slate-400">Ingen kanaler ennå.</p>
        ) : (
          <div className="space-y-3">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="bg-slate-900 rounded-2xl p-4 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold">{ch.name}</p>
                  <p className="text-slate-400 text-sm font-mono">
                    ID: <span className="text-brand-400">{ch.channelKey}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/speak/${ch.id}`)}
                    className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-sm font-semibold transition"
                  >
                    🎙️ Send
                  </button>
                  <button
                    onClick={() => deleteChannel(ch.id)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-900 text-sm transition"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
