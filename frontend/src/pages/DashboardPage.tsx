import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { token, user, logout } = useAuthStore()
  const [channels, setChannels] = useState<any[]>([])
  const [newName, setNewName] = useState('')
  const [plan, setPlan] = useState<'3dager' | '14dager'>('3dager')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (token) api.getChannels(token).then(setChannels).catch(console.error)
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      setTimeout(() => {
        if (token) api.getChannels(token).then(setChannels).catch(console.error)
      }, 2000)
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [token])

  async function createChannel(e: React.FormEvent) {
    e.preventDefault()
    if (!token || !newName.trim()) return
    setCreating(true)
    setError('')
    try {
      const res = await api.createChannelWithPlan(token, newName.trim(), plan)
      if (res.adminBypass) {
        setChannels((prev) => [res.channel, ...prev])
        setNewName('')
      } else if (res.url) {
        window.location.href = res.url
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  function utløperTekst(ch: any): string | null {
    if (!ch.expiresAt) return null
    const dato = new Date(ch.expiresAt)
    return `Utløper ${dato.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}`
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
        <form onSubmit={createChannel} className="space-y-3">
          <input
            type="text"
            placeholder="Navn på kanal"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-brand-500 focus:outline-none transition"
          />
          <div className="grid grid-cols-2 gap-2">
            {([['3dager', '3 dager', '199 kr'], ['14dager', '14 dager', '349 kr']] as const).map(([val, label, pris]) => (
              <button
                key={val}
                type="button"
                onClick={() => setPlan(val)}
                className={`py-3 rounded-xl border text-sm font-semibold transition ${
                  plan === val
                    ? 'bg-brand-600 border-brand-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}
              >
                <div>{label}</div>
                <div className={plan === val ? 'text-brand-200' : 'text-slate-400'}>{pris}</div>
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 font-semibold transition"
          >
            {creating ? 'Videresender til betaling…' : 'Opprett og betal →'}
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
                  {utløperTekst(ch) && (
                    <p className="text-xs text-slate-500 mt-0.5">{utløperTekst(ch)}</p>
                  )}
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
