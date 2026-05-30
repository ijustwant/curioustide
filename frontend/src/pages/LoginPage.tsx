import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register(email, password, name || undefined)
      setAuth(result.token, result.user)
      navigate('/')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-400">CuriousTide</h1>
          <p className="text-slate-400 mt-1">Live lyd for arrangementer</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-800">
          <div className="flex rounded-xl bg-slate-800 p-1 mb-6">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === m ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {m === 'login' ? 'Logg inn' : 'Registrer'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <input
                type="text"
                placeholder="Navn (valgfritt)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-brand-500 focus:outline-none transition"
              />
            )}
            <input
              type="email"
              placeholder="E-post"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-brand-500 focus:outline-none transition"
            />
            <input
              type="password"
              placeholder="Passord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-brand-500 focus:outline-none transition"
            />

            {error && (
              <p className="text-red-400 text-sm bg-red-950/50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 font-semibold transition"
            >
              {loading ? 'Venter...' : mode === 'login' ? 'Logg inn' : 'Opprett konto'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
