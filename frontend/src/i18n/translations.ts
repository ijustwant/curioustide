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
    'auth.loading': 'Venter...',
    'auth.createAccount': 'Opprett konto',
    'auth.logout': 'Logg ut',
    'auth.forgotPassword': 'Glemt passord?',
    'auth.forgotPasswordTitle': 'Glemt passord',
    'auth.forgotPasswordSub': 'Vi sender deg en lenke for å tilbakestille passordet ditt.',
    'auth.sendResetLink': 'Send tilbakestillingslenke',
    'auth.resetEmailSent': 'Sjekk e-posten din. Om adressen finnes hos oss, har vi sendt en lenke.',
    'auth.resetPasswordTitle': 'Nytt passord',
    'auth.newPassword': 'Nytt passord (min. 8 tegn)',
    'auth.setNewPassword': 'Sett nytt passord',
    'auth.passwordChanged': 'Passordet er oppdatert. Du kan nå logge inn.',
    'auth.tokenExpired': 'Lenken er ugyldig eller utløpt. Be om en ny.',

    // Dashboard
    'dashboard.listen': 'Lytt',
    'dashboard.listenSub': 'Koble til en kanal og lytt',
    'dashboard.newChannel': 'Ny kanal',
    'dashboard.channelName': 'Navn på kanal',
    'dashboard.createAndPay': 'Opprett og betal →',
    'dashboard.redirecting': 'Videresender til betaling…',
    'dashboard.myChannels': 'Mine kanaler',
    'dashboard.noChannels': 'Ingen kanaler ennå.',
    'dashboard.expires': 'Utløper',
    'dashboard.send': 'Send',
    'dashboard.help': '?',
    'dashboard.paymentSuccess': 'Betaling vellykket',

    // Speak
    'speak.title': '🎙️ Send lyd',
    'speak.channel': 'Kanal:',
    'speak.live': 'LIVE – sender lyd',
    'speak.start': '▶ Start',
    'speak.stop': '⏹ Stopp',
    'speak.connecting': 'Kobler til...',
    'speak.testStart': '🔊 Test (2kHz)',
    'speak.testStop': '⏹ Stopp test-tone',
    'speak.hint': 'Gi kanalkoden til lyttere. Test-tonen spiller 2kHz hvert 1,5 sekund.',
    'speak.micError': 'Mikrofon er ikke tilgjengelig. Åpne siden via https:// eller http://localhost — Chrome blokkerer mikrofon på HTTP med IP-adresse.',

    // Listen
    'listen.title': '🎧 Lytt',
    'listen.placeholder': 'Tast inn kanal-ID (f.eks. ABC123)',
    'listen.connect': '🎧 Koble til',
    'listen.connecting': 'Kobler til...',
    'listen.listening': 'Lytter til:',
    'listen.testSound': '🔊 Test lyd',
    'listen.testing': '🔊 Tester...',
    'listen.disconnect': '⏹ Koble fra',

    // Help
    'help.title': 'Hjelp',
    'help.contact': '💬 Spørsmål?',
    'help.contactText': 'Ta kontakt på',
    'help.contactEmail': 'hjelp@curioustide.no',
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
          'Nettlesere krever HTTPS for mikrofonbruk — curioustide.no er alltid kryptert.',
        ],
      },
    ],

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

    // Payment success
    'payment.successTitle': 'Betaling fullført!',
    'payment.successBody': 'Kanalen din er opprettet. Gå tilbake til appen for å bruke den.',
    'payment.openApp': 'Åpne appen',
    'payment.openWeb': 'Gå til nettsiden',

    // Email
    'email.timerSubject': (channelName: string) => `Timeren har startet – kanal «${channelName}»`,
    'email.timerBody': (channelName: string, dato: string) => [
      'Hei!',
      '',
      `Timeren for kanalen «${channelName}» har nå startet.`,
      `Kanalen er tilgjengelig til: ${dato}`,
      '',
      '– CuriousTide',
    ].join('\n'),
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
    'auth.loading': 'Please wait...',
    'auth.createAccount': 'Create account',
    'auth.logout': 'Log out',
    'auth.forgotPassword': 'Forgot password?',
    'auth.forgotPasswordTitle': 'Forgot password',
    'auth.forgotPasswordSub': 'We will send you a link to reset your password.',
    'auth.sendResetLink': 'Send reset link',
    'auth.resetEmailSent': 'Check your email. If the address exists in our system, we have sent a link.',
    'auth.resetPasswordTitle': 'New password',
    'auth.newPassword': 'New password (min. 8 characters)',
    'auth.setNewPassword': 'Set new password',
    'auth.passwordChanged': 'Your password has been updated. You can now log in.',
    'auth.tokenExpired': 'The link is invalid or has expired. Please request a new one.',

    // Dashboard
    'dashboard.listen': 'Listen',
    'dashboard.listenSub': 'Join a channel and listen',
    'dashboard.newChannel': 'New channel',
    'dashboard.channelName': 'Channel name',
    'dashboard.createAndPay': 'Create and pay →',
    'dashboard.redirecting': 'Redirecting to payment…',
    'dashboard.myChannels': 'My channels',
    'dashboard.noChannels': 'No channels yet.',
    'dashboard.expires': 'Expires',
    'dashboard.send': 'Send',
    'dashboard.help': '?',
    'dashboard.paymentSuccess': 'Payment successful',

    // Speak
    'speak.title': '🎙️ Broadcast',
    'speak.channel': 'Channel:',
    'speak.live': 'LIVE – broadcasting',
    'speak.start': '▶ Start',
    'speak.stop': '⏹ Stop',
    'speak.connecting': 'Connecting...',
    'speak.testStart': '🔊 Test (2kHz)',
    'speak.testStop': '⏹ Stop test tone',
    'speak.hint': 'Share the channel code with listeners. The test tone plays 2kHz every 1.5 seconds.',
    'speak.micError': 'Microphone not available. Open the page via https:// or http://localhost — Chrome blocks microphone on HTTP with an IP address.',

    // Listen
    'listen.title': '🎧 Listen',
    'listen.placeholder': 'Enter channel ID (e.g. ABC123)',
    'listen.connect': '🎧 Connect',
    'listen.connecting': 'Connecting...',
    'listen.listening': 'Listening to:',
    'listen.testSound': '🔊 Test audio',
    'listen.testing': '🔊 Testing...',
    'listen.disconnect': '⏹ Disconnect',

    // Help
    'help.title': 'Help',
    'help.contact': '💬 Questions?',
    'help.contactText': 'Contact us at',
    'help.contactEmail': 'help@curioustide.com',
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
          'Browsers require HTTPS for microphone access — curioustide.com is always encrypted.',
        ],
      },
    ],

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

    // Payment success
    'payment.successTitle': 'Payment complete!',
    'payment.successBody': 'Your channel has been created. Return to the app to use it.',
    'payment.openApp': 'Open app',
    'payment.openWeb': 'Go to website',

    // Email
    'email.timerSubject': (channelName: string) => `Timer started – channel "${channelName}"`,
    'email.timerBody': (channelName: string, dato: string) => [
      'Hi!',
      '',
      `The timer for channel "${channelName}" has now started.`,
      `The channel is available until: ${dato}`,
      '',
      '– CuriousTide',
    ].join('\n'),
  },
} as const satisfies Record<Lang, Record<string, unknown>>
