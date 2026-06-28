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
    'dashboard.deleteTitle': 'Slett kanal',
    'dashboard.deleteConfirm': 'Er du sikker på at du vil slette «{name}»? Dette kan ikke angres.',
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
          'Betaling skjer via Stripe. Etter betaling sendes du tilbake til appen, og kanalen er klar i listen.',
          'Trykk "Send" på kanalen for å starte sendingen.',
          'Koble til en Bluetooth-mikrofon for best lydkvalitet.',
          'Timeren starter første gang du trykker "Send" — ikke ved opprettelse eller betaling.',
          'Du kan stoppe og starte sendingen igjen uten at timeren nullstilles.',
          'Du får en e-post når timeren starter, med dato for når kanalen utløper.',
        ],
      },
      {
        tittel: '🎧 Slik lytter du',
        innhold: [
          'Trykk på den store "Lytt"-knappen øverst på dashbordet.',
          'Skriv inn kanal-ID-en du har fått fra senderen (f.eks. AB12CD).',
          'Trykk "Koble til" — lyden starter automatisk når senderen er aktiv.',
          'Bruk "Test lyd"-knappen for å sjekke at høyttaleren din virker.',
          'Du kan lytte fra mobil eller nettleser — ingen app nødvendig for lyttere.',
          'Del nettadressen curioustide.no med dem som skal lytte.',
        ],
      },
      {
        tittel: '👥 Invitere medtalere',
        innhold: [
          'Du kan invitere andre til å sende lyd på kanalen din.',
          'Trykk på "Inviter taler"-knappen på kanalen i dashbordet.',
          'Skriv inn e-postadressen til medtaleren og trykk "Inviter".',
          'Medtaleren mottar en e-post og ser invitasjonen under "Invitasjoner" i sin app.',
          'Etter at invitasjonen er godtatt, kan medtaleren sende lyd på kanalen.',
          'Delte kanaler vises under "Delte kanaler" i dashbordet.',
        ],
      },
      {
        tittel: '⏱️ Priser og varighet',
        innhold: [
          '3 dager — 249 kr. Timeren starter ved første sending.',
          '7 dager — 399 kr. Timeren starter ved første sending.',
          'Kanalen er tilgjengelig i hele perioden, uavhengig av hvor mye du sender.',
          'En kanal kan slettes fra dashbordet ved å trykke på krysset (✕). Du blir bedt om å bekrefte før sletting.',
        ],
      },
      {
        tittel: '🔑 Konto og passord',
        innhold: [
          'Opprett konto med e-post og passord. Navn er valgfritt.',
          'Har du glemt passordet? Trykk "Glemt passord?" på innloggingssiden.',
          'Du mottar en e-post med en lenke for å sette nytt passord.',
          'Lenken er gyldig i 1 time. Be om en ny om den er utløpt.',
        ],
      },
      {
        tittel: '📡 Teknisk',
        innhold: [
          'Lyden streames via WebRTC med Opus-codec — typisk forsinkelse er 20–100 ms.',
          'Krever god internettforbindelse hos sender (minst 1 Mbit/s opplasting).',
          'Lyttere bruker svært lite data og kan lytte på mobilnett.',
          'Hvis mikrofonen ikke virker, sjekk at appen har fått tillatelse under telefoninnstillinger.',
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
    'plan.days14': '7 dager',
    'plan.price3': '249 kr',
    'plan.price14': '399 kr',
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
    'dashboard.deleteTitle': 'Delete channel',
    'dashboard.deleteConfirm': 'Are you sure you want to delete "{name}"? This cannot be undone.',
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
          'Payment is handled via Stripe. After payment you are returned to the app and the channel appears in your list.',
          'Tap "Send" on the channel to start broadcasting.',
          'Connect a Bluetooth microphone for best audio quality.',
          'The timer starts the first time you tap "Send" — not at creation or payment.',
          'You can stop and restart the broadcast without resetting the timer.',
          'You will receive an email when the timer starts, with the date your channel expires.',
        ],
      },
      {
        tittel: '🎧 How to listen',
        innhold: [
          'Tap the large "Listen" button at the top of the dashboard.',
          'Enter the channel ID you received from the broadcaster (e.g. AB12CD).',
          'Tap "Connect" — audio starts automatically when the broadcaster is active.',
          'Use the "Test audio" button to verify your speaker is working.',
          'You can listen from mobile or browser — no app required for listeners.',
          'Share curioustide.com with anyone who wants to listen.',
        ],
      },
      {
        tittel: '👥 Inviting co-speakers',
        innhold: [
          'You can invite others to broadcast on your channel.',
          'Tap the "Invite speaker" button on a channel in the dashboard.',
          'Enter the co-speaker\'s email address and tap "Invite".',
          'They will receive an email and see the invitation under "Invitations" in their app.',
          'Once accepted, the co-speaker can broadcast on your channel.',
          'Shared channels appear under "Shared channels" in the dashboard.',
        ],
      },
      {
        tittel: '⏱️ Pricing and duration',
        innhold: [
          '3 days — 249 NOK. The timer starts on first broadcast.',
          '7 days — 399 NOK. The timer starts on first broadcast.',
          'The channel is available for the entire period, regardless of how much you broadcast.',
          'A channel can be deleted from the dashboard by tapping the ✕ button. You will be asked to confirm before deletion.',
        ],
      },
      {
        tittel: '🔑 Account and password',
        innhold: [
          'Create an account with email and password. Name is optional.',
          'Forgot your password? Tap "Forgot password?" on the login screen.',
          'You will receive an email with a link to set a new password.',
          'The link is valid for 1 hour. Request a new one if it has expired.',
        ],
      },
      {
        tittel: '📡 Technical',
        innhold: [
          'Audio is streamed via WebRTC with Opus codec — typical latency is 20–100 ms.',
          'Requires a good internet connection for the broadcaster (at least 1 Mbit/s upload).',
          'Listeners use very little data and can listen on mobile networks.',
          'If the microphone does not work, check that the app has been granted permission in your phone settings.',
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
    'plan.days14': '7 days',
    'plan.price3': '249 NOK',
    'plan.price14': '399 NOK',
  },
} as const satisfies Record<Lang, Record<string, unknown>>
