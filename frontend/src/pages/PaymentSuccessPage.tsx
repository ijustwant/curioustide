import { useEffect } from 'react'
import { useT } from '../i18n'

export default function PaymentSuccessPage() {
  const t = useT()

  useEffect(() => {
    // Prøv å åpne appen via deep link etter kort pause
    const timer = setTimeout(() => {
      window.location.href = 'curioustide://dashboard'
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
        <div className="text-5xl mb-4">✓</div>
        <h1 className="text-2xl font-bold text-sky-400 mb-2">
          {t('payment.successTitle')}
        </h1>
        <p className="text-gray-300 mb-6">
          {t('payment.successBody')}
        </p>
        <button
          onClick={() => { window.location.href = 'curioustide://dashboard' }}
          className="w-full bg-sky-500 hover:bg-sky-400 text-white font-bold py-3 px-6 rounded-xl mb-3 transition"
        >
          {t('payment.openApp')}
        </button>
        <button
          onClick={() => { window.location.href = '/' }}
          className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 font-semibold py-3 px-6 rounded-xl transition"
        >
          {t('payment.openWeb')}
        </button>
      </div>
    </div>
  )
}
