import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useT } from '../i18n'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const t = useT()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.forgotPassword(email)
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-400">CuriousTide</h1>
          <p className="text-slate-400 mt-1">{t('auth.forgotPasswordTitle')}</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-800">
          {sent ? (
            <div className="text-center space-y-4">
              <p className="text-green-400 text-sm">{t('auth.resetEmailSent')}</p>
              <button
                onClick={() => navigate('/login')}
                className="text-brand-400 hover:underline text-sm"
              >
                {t('auth.login')} →
              </button>
            </div>
          ) : (
            <>
              <p className="text-slate-400 text-sm mb-5">{t('auth.forgotPasswordSub')}</p>
              <form onSubmit={submit} className="space-y-4">
                <input
                  type="email"
                  placeholder={t('auth.email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 focus:border-brand-500 focus:outline-none transition"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 font-semibold transition"
                >
                  {loading ? t('auth.loading') : t('auth.sendResetLink')}
                </button>
              </form>
              <button
                onClick={() => navigate('/login')}
                className="w-full mt-4 text-slate-500 hover:text-slate-300 text-sm text-center transition"
              >
                ← {t('auth.login')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
