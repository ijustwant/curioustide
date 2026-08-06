export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-4 py-10 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-brand-400 mb-2">Personvernerklæring</h1>
      <p className="text-slate-400 text-sm mb-8">Sist oppdatert: juni 2026</p>

      <div className="space-y-8 text-slate-300">
        <section>
          <h2 className="text-lg font-semibold text-white mb-2">1. Behandlingsansvarlig</h2>
          <p className="text-sm leading-relaxed">
            CuriousTide er ansvarlig for behandlingen av dine personopplysninger.
            Kontakt oss på <a href="mailto:hjelp@curioustide.no" className="text-brand-400 underline">hjelp@curioustide.no</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">2. Hvilke opplysninger vi samler inn</h2>
          <ul className="text-sm space-y-1 leading-relaxed list-disc list-inside">
            <li>E-postadresse (påkrevd ved registrering)</li>
            <li>Navn (valgfritt)</li>
            <li>Betalingshistorikk via Stripe (vi lagrer ikke kortdata — det håndteres av Stripe)</li>
            <li>Kanalinformasjon og tidsstempler knyttet til kontoen din</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">3. Formål med behandlingen</h2>
          <ul className="text-sm space-y-1 leading-relaxed list-disc list-inside">
            <li>Opprette og administrere brukerkontoen din</li>
            <li>Behandle betalinger og gi tilgang til kanaler</li>
            <li>Sende e-poster om kontostatus (f.eks. kanalutløp, passordtilbakestilling)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">4. Rettslig grunnlag</h2>
          <p className="text-sm leading-relaxed">
            Behandlingen er basert på avtale (GDPR artikkel 6(1)(b)) — vi trenger opplysningene for å
            levere tjenesten du har bestilt.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">5. Deling med tredjepart</h2>
          <ul className="text-sm space-y-1 leading-relaxed list-disc list-inside">
            <li><strong className="text-white">Stripe</strong> — betalingsbehandler (lagrer betalingsdata)</li>
            <li><strong className="text-white">Hetzner Online GmbH</strong> — serverhosting i EU (Finland)</li>
            <li>Vi deler ikke opplysninger med andre tredjeparter eller bruker dem til markedsføring</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">6. Lagringstid</h2>
          <p className="text-sm leading-relaxed">
            Kontoen din og tilhørende data beholdes så lenge du er aktiv bruker. Du kan be om sletting
            ved å kontakte oss. Opptaksdata slettes automatisk etter 30 dager.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">7. Dine rettigheter</h2>
          <p className="text-sm leading-relaxed mb-2">Du har rett til å:</p>
          <ul className="text-sm space-y-1 leading-relaxed list-disc list-inside">
            <li>Få innsyn i hvilke opplysninger vi har om deg</li>
            <li>Korrigere feilaktige opplysninger</li>
            <li>Be om sletting av kontoen din</li>
            <li>Trekke tilbake samtykke (der dette er grunnlaget)</li>
            <li>Klage til Datatilsynet (datatilsynet.no)</li>
          </ul>
          <p className="text-sm leading-relaxed mt-2">
            Send henvendelse til <a href="mailto:hjelp@curioustide.no" className="text-brand-400 underline">hjelp@curioustide.no</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-2">8. Informasjonskapsler (cookies)</h2>
          <p className="text-sm leading-relaxed">
            Vi bruker kun teknisk nødvendige informasjonskapsler for innlogging (JWT-token i localStorage).
            Vi benytter ingen sporings- eller reklamecookies.
          </p>
        </section>
      </div>

      <p className="text-slate-500 text-xs mt-10">
        © 2026 CuriousTide · <a href="mailto:hjelp@curioustide.no" className="underline">hjelp@curioustide.no</a>
      </p>
    </div>
  )
}
