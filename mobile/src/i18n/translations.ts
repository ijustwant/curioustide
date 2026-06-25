export type Lang = 'no' | 'en'

export const translations = {
  no: {
    // App
    'app.tagline': 'Live lyd for arrangementer',
    'app.back': '← Tilbake',

    // Auth
    'auth.login': 'Logg inn',
    'auth.register': 'Registrer',
    'auth.name': 'Navn (valgfritt)',
    'auth.email': 'E-post',
    'auth.password': 'Passord',
    'auth.createAccount': 'Opprett konto',
    'auth.logout': 'Logg ut',
    'auth.forgotPassword': 'Glemt passord?',
    'auth.forgotPasswordTitle': 'Glemt passord',
    'auth.forgotPasswordSub': 'Vi sender deg en lenke for å tilbakestille passordet ditt.',
    'auth.sendResetLink': 'Send tilbakestillingslenke',
    'auth.resetEmailSent': 'Sjekk e-posten din. Om adressen finnes hos oss, har vi sendt en lenke med en lenke.',
    'auth.backToLogin': 'Tilbake til innlogging',

    // Dashboard
    'dashboard.listen': 'Lytt',
    'dashboard.listenSub': 'Koble til en kanal og lytt',
    'dashboard.newChannel': 'Ny kanal',
    'dashboard.channelName': 'Navn på kanal',
    'dashboard.createAndPay': 'Opprett og betal →',
    'dashboard.myChannels': 'Mine kanaler',
    'dashboard.noChannels': 'Ingen kanaler ennå.',
    'dashboard.expires': 'Utløper',
    'dashboard.send': 'Send',
    'dashboard.error': 'Feil',

    // Speak
    'speak.channelId': 'Kanal-ID',
    'speak.live': 'LIVE – sender lyd',
    'speak.start': '▶  Start',
    'speak.stop': '⏹  Stopp',
    'speak.connecting': 'Kobler til...',
    'speak.testStart': '🔊  Test (2kHz)',
    'speak.testStop': '⏹  Stopp test',
    'speak.hint': 'Del kanal-ID med lyttere.\nTest-tonen spiller 2kHz hvert 1,5 sekund.',

    // Listen
    'listen.channelId': 'Kanal-ID',
    'listen.placeholder': 'F.eks. ABC123',
    'listen.connect': '🎧  Koble til',
    'listen.connecting': 'Kobler til...',
    'listen.listeningTo': 'Lytter til',
    'listen.testSound': '🔊  Test lyd',
    'listen.testing': '🔊  Tester...',
    'listen.disconnect': '⏹  Koble fra',

    // Help sections
    'help.sections': [
      {
        tittel: '🎙️ Slik sender du lyd',
        innhold: [
          'Opprett en kanal fra dashbordet og velg ønsket varighet (3 eller 14 dager).',
          'Etter betaling finner du kanalen i listen. Trykk "Send" for å starte.',
          'Koble til en Bluetooth-mikrofon for best lydkvalitet.',
          'Timeren starter første gang du trykker "Send" — ikke ved opprettelse.',
          'Du kan stoppe og starte sendingen igjen uten at timeren nullstilles.',
        ],
      },
      {
        tittel: '🎧 Slik lytter du',
        innhold: [
          'Trykk på den store "Lytt"-knappen øverst på dashbordet.',
          'Skriv inn kanal-ID-en du har fått fra senderen (f.eks. AB12CD).',
          'Du kan lytte fra mobil eller nettleser — ingen app nødvendig for lyttere.',
          'Del nettadressen curioustide.no med dem som skal lytte.',
        ],
      },
      {
        tittel: '⏱️ Priser og varighet',
        innhold: [
          '3 dager — 199 kr. Timeren starter ved første sending.',
          '14 dager — 349 kr. Timeren starter ved første sending.',
          'Kanalen er tilgjengelig i hele perioden, uavhengig av hvor mye du sender.',
          'Du mottar en e-post når timeren starter, med dato for når kanalen utløper.',
        ],
      },
      {
        tittel: '📡 Teknisk',
        innhold: [
          'Lyden streames via WebRTC med Opus-codec — typisk forsinkelse er 20–100 ms.',
          'Krever god internettforbindelse hos sender (minst 1 Mbit/s opplasting).',
          'Lyttere bruker svært lite data og kan lytte på mobilnett.',
        ],
      },
    ],
    'help.questions': '💬 Spørsmål?',
    'help.contactText': 'Ta kontakt på hjelp@curioustide.no',

    // Invite
    'invite.button': 'Inviter taler',
    'invite.emailPlaceholder': 'E-post til medtaler',
    'invite.send': 'Inviter',
    'invite.sending': 'Sender...',
    'invite.ok': 'Invitert!',
    'invite.cancel': 'Avbryt',
    'invite.pendingTitle': 'Invitasjoner',
    'invite.sharedTitle': 'Delte kanaler',
    'invite.accept': 'Godta',
    'invite.invitedBy': 'Invitert av',

    // Plans
    'plan.days3': '3 dager',
    'plan.days14': '14 dager',
    'plan.price3': '199 kr',
    'plan.price14': '349 kr',
  },

  en: {
    // App
    'app.tagline': 'Live audio for events',
    'app.back': '← Back',

    // Auth
    'auth.login': 'Log in',
    'auth.register': 'Register',
    'auth.name': 'Name (optional)',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.createAccount': 'Create account',
    'auth.logout': 'Log out',
    'auth.forgotPassword': 'Forgot password?',
    'auth.forgotPasswordTitle': 'Forgot password',
    'auth.forgotPasswordSub': 'We will send you a link to reset your password.',
    'auth.sendResetLink': 'Send reset link',
    'auth.resetEmailSent': 'Check your email. If the address exists in our system, we have sent a reset link.',
    'auth.backToLogin': 'Back to login',

    // Dashboard
    'dashboard.listen': 'Listen',
    'dashboard.listenSub': 'Join a channel and listen',
    'dashboard.newChannel': 'New channel',
    'dashboard.channelName': 'Channel name',
    'dashboard.createAndPay': 'Create and pay →',
    'dashboard.myChannels': 'My channels',
    'dashboard.noChannels': 'No channels yet.',
    'dashboard.expires': 'Expires',
    'dashboard.send': 'Send',
    'dashboard.error': 'Error',

    // Speak
    'speak.channelId': 'Channel ID',
    'speak.live': 'LIVE – broadcasting',
    'speak.start': '▶  Start',
    'speak.stop': '⏹  Stop',
    'speak.connecting': 'Connecting...',
    'speak.testStart': '🔊  Test (2kHz)',
    'speak.testStop': '⏹  Stop test',
    'speak.hint': 'Share the channel ID with listeners.\nTest tone plays 2kHz every 1.5 seconds.',

    // Listen
    'listen.channelId': 'Channel ID',
    'listen.placeholder': 'E.g. ABC123',
    'listen.connect': '🎧  Connect',
    'listen.connecting': 'Connecting...',
    'listen.listeningTo': 'Listening to',
    'listen.testSound': '🔊  Test audio',
    'listen.testing': '🔊  Testing...',
    'listen.disconnect': '⏹  Disconnect',

    // Help sections
    'help.sections': [
      {
        tittel: '🎙️ How to broadcast',
        innhold: [
          'Create a channel from the dashboard and choose your desired duration (3 or 14 days).',
          'After payment, find the channel in your list and tap "Send" to start.',
          'Connect a Bluetooth microphone for best audio quality.',
          'The timer starts the first time you tap "Send" — not at creation.',
          'You can stop and restart the broadcast without resetting the timer.',
        ],
      },
      {
        tittel: '🎧 How to listen',
        innhold: [
          'Tap the large "Listen" button at the top of the dashboard.',
          'Enter the channel ID you received from the broadcaster (e.g. AB12CD).',
          'You can listen from mobile or browser — no app required for listeners.',
          'Share curioustide.com with anyone who wants to listen.',
        ],
      },
      {
        tittel: '⏱️ Pricing and duration',
        innhold: [
          '3 days — 199 NOK. The timer starts on first broadcast.',
          '14 days — 349 NOK. The timer starts on first broadcast.',
          'The channel is available for the entire period, regardless of how much you broadcast.',
          'You will receive an email when the timer starts, with the expiry date.',
        ],
      },
      {
        tittel: '📡 Technical',
        innhold: [
          'Audio is streamed via WebRTC with Opus codec — typical latency is 20–100 ms.',
          'Requires a good internet connection for the broadcaster (at least 1 Mbit/s upload).',
          'Listeners use very little data and can listen on mobile networks.',
        ],
      },
    ],
    'help.questions': '💬 Questions?',
    'help.contactText': 'Contact us at help@curioustide.com',

    // Invite
    'invite.button': 'Invite speaker',
    'invite.emailPlaceholder': 'Co-speaker email',
    'invite.send': 'Invite',
    'invite.sending': 'Sending...',
    'invite.ok': 'Invited!',
    'invite.cancel': 'Cancel',
    'invite.pendingTitle': 'Invitations',
    'invite.sharedTitle': 'Shared channels',
    'invite.accept': 'Accept',
    'invite.invitedBy': 'Invited by',

    // Plans
    'plan.days3': '3 days',
    'plan.days14': '14 days',
    'plan.price3': '199 NOK',
    'plan.price14': '349 NOK',
  },
} as const satisfies Record<Lang, Record<string, unknown>>
