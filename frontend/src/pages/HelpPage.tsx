import { useNavigate } from 'react-router-dom'
import { useT, useSections } from '../i18n'

export default function HelpPage() {
  const navigate = useNavigate()
  const t = useT()
  const sections = useSections()

  return (
    <div className="min-h-screen px-4 py-6 max-w-2xl mx-auto">
      <header className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate('/')}
          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-medium transition"
        >
          {t('app.back')}
        </button>
        <h1 className="text-2xl font-bold text-brand-400">{t('help.title')}</h1>
      </header>

      <div className="space-y-6">
        {sections.map((s) => (
          <section key={s.tittel} className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
            <h2 className="text-lg font-semibold mb-3">{s.tittel}</h2>
            <ul className="space-y-2">
              {s.innhold.map((linje, i) => (
                <li key={i} className="flex gap-2 text-slate-300 text-sm">
                  <span className="text-brand-400 mt-0.5 shrink-0">•</span>
                  {linje}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="bg-slate-900 rounded-2xl p-5 border border-slate-800">
          <h2 className="text-lg font-semibold mb-3">{t('help.contact')}</h2>
          <p className="text-slate-300 text-sm">
            {t('help.contactText')}{' '}
            <a href={`mailto:${t('help.contactEmail')}`} className="text-brand-400 hover:underline">
              {t('help.contactEmail')}
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
