import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api'
import { useT } from '../i18n'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const t = useT()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.resetPassword(token, password)
      setDone(true)
    } catch (err: any) {
      setError(t('auth.tokenExpired'))
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-red-400">{t('auth.tokenExpired')}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-400">CuriousTide</h1>
          <p className="text-slate-400 mt-1">{t('auth.resetPasswordTitle')}</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-800">
          {done ? (
            <div className="text-center space-y-4">
              <p className="text-green-400 text-sm">{t('auth.passwordChanged')}</p>
              <button
                onClick={() => navigate('/login')}
                className="text-brand-400 hover:underline text-sm"
              >
                {t('auth.login')} →
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <input
                type="password"
                placeholder={t('auth.newPassword')}
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
                {loading ? t('auth.loading') : t('auth.setNewPassword')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
