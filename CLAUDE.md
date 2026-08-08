# CuriousTide

Lav-latens lyd-streaming tjeneste for arrangementer. Én sender (med Bluetooth-mikrofon) distribuerer lyd til mange lyttere via mobil/nettleser med ~20–100ms forsinkelse.

## Arkitektur

```
nginx (port 80/443)
  ├── /api         → backend Fastify (port 4000)
  ├── /livekit     → LiveKit SFU (port 7880)
  ├── /recordings/ → MinIO (port 9000) — offentlig tilgang for presignerte URL-er
  ├── /download/   → statiske APK-filer
  └── /            → frontend React PWA (port 3000)

PostgreSQL (5432) · Redis (6379) · MinIO (9000/9001) · LiveKit Ingress (klipp-avspilling)
```

**Lyd-transport:** LiveKit WebRTC SFU med Opus-codec (adaptiv bitrate 6–510 kbps, ~20–100ms latens)

## Kom i gang

### 1. Konfigurer miljøvariabler

```bash
cp .env.example .env
# Rediger .env — endre alle passord og secrets
# VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY: npx web-push generate-vapid-keys
```

### 2. Start alle tjenester

**Alltid bruk prod-overlay** (ekte SSL-sertifikat + APK-nedlasting + offentlig MinIO-ruting):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

`docker compose up` alene bruker selvsignert sertifikat som bryter HTTPS og login, og MinIO-presignerte URL-er peker på det interne Docker-navnet `minio` (fungerer ikke fra utsiden).

### 3. Kjør backend i utviklingsmodus (uten Docker)

```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

## Mapper

| Mappe | Innhold |
|-------|---------|
| `backend/` | Fastify API, Prisma ORM, LiveKit token-service, opptak, push-varsler, intervju-klipp |
| `backend/scripts/` | Engangs-migrasjonsscript (kjøres manuelt, ikke del av normal drift) |
| `frontend/` | React 18 + Vite + Tailwind PWA, med Web Push (service worker) |
| `mobile/` | React Native + Expo (Android + iOS), med push-varsler, intervju-opptak, bakgrunnslyd |
| `mobile/plugins/` | Egendefinerte Expo config-plugins (se "Kjente fallgruver" under) |
| `livekit/` | LiveKit SFU- og Ingress-konfigurasjon |
| `nginx/` | Reverse proxy |

## Backend API

Alle endepunkter krever `Authorization: Bearer <JWT>` unntatt `/auth/register`, `/auth/login` og `/payments/webhook`.

| Metode | Sti | Beskrivelse |
|--------|-----|-------------|
| POST | `/auth/register` | Opprett konto |
| POST | `/auth/login` | Logg inn, returner JWT |
| GET | `/auth/me` | Hent innlogget bruker |
| GET | `/channels` | Hent egne kanaler |
| POST | `/channels` | Opprett kanal (admin) |
| DELETE | `/channels/:id` | Slett kanal |
| POST | `/channels/:id/token` | Hent LiveKit-token (role: speaker/listener) |
| POST | `/channels/join/:key` | Lytter-token via kanal-ID (returnerer også `channelId`) |
| POST | `/channels/:id/invite` | Inviter medtaler |
| POST | `/channels/:id/subscribe` | Lytter melder seg på push-varsler for kanalen |
| POST | `/channels/:id/notify` | Sender/medtaler pusher varsel til alle abonnenter |
| POST | `/channels/:id/clips/upload-url` | Presignert URL for å laste opp intervju-klipp |
| POST | `/channels/:id/clips` | Bekreft opplasting, opprett klipp-rad |
| GET | `/channels/:id/clips` | List klipp for kanalen |
| PATCH | `/channels/:id/clips/:clipId` | Endre navn på klipp |
| POST | `/channels/:id/clips/:clipId/play` | Spill klippet live inn i pågående sending (LiveKit Ingress) |
| POST | `/channels/:id/clips/:clipId/stop` | Stopp pågående avspilling |
| DELETE | `/channels/:id/clips/:clipId` | Slett klipp |
| POST | `/push/register` | Registrer Expo push-token (mobil) |
| POST | `/push/subscribe` | Registrer web push-abonnement (nettside) |
| GET | `/events` | Hent egne arrangementer |
| POST | `/events` | Opprett arrangement |
| POST | `/events/:id/start` | Start arrangement (evt. opptak) |
| POST | `/events/:id/stop` | Stopp arrangement |
| GET | `/events/:id/download` | Signert nedlastings-URL |

## Priser

Definert i `backend/src/routes/payments.ts` (`PLANER`, i øre) og `backend/src/routes/channels.ts` (`PLAN_DAGER`, varighet i dager) — **disse to må ha samme nøkler** (`'3dager'`, `'7dager'`), ellers settes aldri `expiresAt` og kanalen utløper aldri. Prisene vises også hardkodet i `frontend/src/i18n/translations.ts` og `mobile/src/i18n/translations.ts` (`plan.price3`/`plan.price14`) — ingen felles kilde, må oppdateres 4 steder ved prisendring.

- 3 dager — 795 kr
- 7 dager — 1395 kr

## Push-varsler

- Sender/medtaler kan trykke "Send varsel" mens sendingen er aktiv (mobil + nettside) for å pushe en melding til alle som har trykket "Varsle meg"/abonnert på kanalen.
- Mobil: Expo push (`expo-notifications`), krever Firebase-oppsett (`google-services.json`) for at token-registrering skal fungere fullt ut i prod — foreløpig kun delvis konfigurert, feiler stille med en logget advarsel om Firebase ikke er satt opp.
- Nettside: Web Push via VAPID (`web-push`-biblioteket backend, `PushManager` i frontend). Krever `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` i `.env` og `VITE_VAPID_PUBLIC_KEY` i frontend-bygget.
- `ChannelSubscription`-tabellen (ikke `ChannelInvite`) sporer hvem som har meldt seg på varsler for en kanal — helt separat konsept fra medtaler-invitasjoner.

## Intervju-klipp

- I "Send lyd"-skjermen (kun mobil) kan sender/medtaler ta opp et intervju i en pause. Sendingen stoppes automatisk under opptak (samme mikrofon kan ikke brukes til begge samtidig).
- Opptaket lastes opp til MinIO-bucketen `recordings` (samme bucket som arrangements-opptak) under `clips/<channelId>/<nanoid>.m4a`.
- Avspilling skjer **live inn i den pågående sendingen** via en LiveKit Ingress-tjeneste (`URL_INPUT`) som henter klippet fra en presignert MinIO-URL og publiserer det som en egen deltaker i rommet — ikke en lokal avspilling på lytter-siden.
- Klipp-listen polles hvert 8. sekund i appen, slik at inviterte medtalere ser nye klipp uten å måtte logge inn på nytt.
- `mediaDevices.enumerateDevices()`/`deviceId`-constraint brukes for å la senderen velge en spesifikk lydinngang (viktig for eksterne USB-C-mikrofoner som ikke alltid velges automatisk av Android i "communication"-lydmodus).

## Bakgrunnslyd (mobil)

Sendingen fortsetter når skjermen låses, via en Android foreground service (`@notifee/react-native`) + eksplisitt `AudioSession.configureAudio()` på iOS. Se "Kjente fallgruver" for viktige detaljer om oppsettet.

## Automatisk opprydding

Daglig cron-jobb kl. 03:00 (`backend/src/index.ts`):
- Sletter utgåtte opptak (>30 dager) — `deleteExpiredRecordings`
- Sletter utgåtte kanaler (`expiresAt` passert) og tilhørende MinIO-filer (opptak + intervju-klipp) — `deleteExpiredChannels`. `ChannelInvite`, `Event` og `InterviewClip` rydder seg selv via `onDelete: Cascade`.
- `ensureBucket()` kalles ved oppstart av backend — MinIO-bucketen opprettes IKKE automatisk på annen måte, så dette må ikke fjernes.

## Mobilapp (Android-testing via USB)

```bash
cd mobile
npm install

# Generer native Android-prosjekt (kjøres én gang, eller etter app.json-endringer)
npx expo prebuild --platform android

# Koble til Android-telefon via USB med USB-feilsøking aktivert
# Innstillinger → Om telefonen → Trykk "Byggnummer" 7 ganger → Utviklervalg → USB-feilsøking
# NB: Samsung-telefoner kan blokkere bryteren med "Auto Blocker" —
# slå av under Innstillinger → Sikkerhet og personvern → Auto Blocker

adb devices
npx expo run:android
```

### iOS (krever Mac med Xcode)

```bash
npx expo prebuild --platform ios
npx expo run:ios
```

## Bygge og publisere ny APK (EAS Build)

Prosjektet har en robot-bruker på Expo-kontoen (`mcdiver`) dedikert til automatiserte bygg — bruk en `EXPO_TOKEN` fra denne, ikke en personlig token.

```bash
cd mobile
$env:EXPO_TOKEN = "<robot-token>"
npx eas-cli build --platform android --profile apk --non-interactive --no-wait
# Vent til status "finished" (typisk 8–10 min), hent buildUrl, last ned,
# og last opp til /opt/curioustide/downloads/curioustide.apk på serveren
```

**Ta alltid en backup av gjeldende APK før overskriving** (`cp curioustide.apk curioustide-backup-<beskrivelse>.apk` på serveren) — enkel vei tilbake om en ny versjon ikke fungerer.

## Kjente fallgruver

- **@notifee/react-native har ingen Expo config-plugin** i installert versjon. Å liste den i `app.json`s `plugins`-array krasjer `expo config` stille (ingen feilmelding, bare exit-kode 1). Foreground-service-manifest-attributten (`android:foregroundServiceType="microphone"`) må derfor settes via en egen lokal plugin (`mobile/plugins/withNotifeeForegroundServiceType.js`), som også må legge til `tools:replace` siden notifee sitt eget bibliotek allerede deklarerer tjenesten med en annen type (`shortService`) — uten det feiler Gradle manifest-merger.
- **`AndroidForegroundServiceType.FOREGROUND_SERVICE_TYPE_MICROPHONE = 128`**, ikke `1` (`1` er `DATA_SYNC`). Feil verdi krasjer appen på Android 14+ (`ForegroundServiceDidNotStartInTimeException`) siden JS-verdien og manifest-deklarasjonen må matche.
- **MinIO presignerte URL-er må peke på en offentlig adresse**, ikke det interne Docker-navnet `minio`. Rutes gjennom nginx (`/recordings/` i `nginx.prod.conf`) på samme HTTPS-sertifikat som resten av siden. `backend/src/services/minio.ts` har derfor to klienter: én intern (admin-operasjoner) og én "public" (presignerte URL-er), konfigurert via `MINIO_PUBLIC_ENDPOINT`/`MINIO_PUBLIC_PORT`/`MINIO_PUBLIC_USE_SSL` (kun satt i `docker-compose.prod.yml`).
- **MinIO-klienten trenger en eksplisitt `region`** (satt til `'us-east-1'`) — uten den gjør SDK-et et ekstra `getBucketRegion`-kall før hver signering, som feiler bak nginx-proxyen.
- **Node.js 24 er for nytt** for Expo SDK 52-verktøyene lokalt (`expo config` krasjer stille). Bruk Node 20 LTS på utviklingsmaskinen for EAS-bygg/prebuild.
- **PowerShell mister miljøvariabler og PATH mellom hvert verktøykall** i denne økten — `$env:Path` må settes på nytt i hver eneste PowerShell-kommando som trenger `git`/`node`/`npx`.
- **PowerShell tolker `$(...)` i doble anførselstegn selv i eksterne SSH-kommandostrenger** — bruk enkle anførselstegn rundt hele den eksterne bash-kommandoen når den inneholder `$(...)`, ellers prøver PowerShell å kjøre subshell-uttrykket lokalt på Windows.
- **Serveren kjører i UTC**, ikke norsk tid — tidsstempler til visning (f.eks. standardnavn på intervju-klipp) genereres derfor klient-side med enhetens egen lokale tid, ikke server-side.

## Produksjon

Server: Hetzner Cloud, tilgang via SSH-nøkkel (se separat dokumentasjon/passordbehandler for detaljer — ikke i dette repoet).

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Husk å:
1. Sette opp SSL (La oss kryptere / nginx-certbot)
2. Endre `VITE_LIVEKIT_URL` til `wss://ditt-domene.no/livekit`
3. I mobilapp: endre `LIVEKIT_URL` og `BASE` URL i `mobile/src/services/api.ts`
4. Åpne UDP-porter 50100–50200 i brannmur (kreves av LiveKit for WebRTC)
5. Sette `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VITE_VAPID_PUBLIC_KEY` for push-varsler
6. Kjøre `ensureBucket()`-avhengig oppstart minst én gang (skjer automatisk ved backend-start)

## Teknologistack

- **Backend:** Node.js 22 + Fastify + TypeScript + Prisma + PostgreSQL + Redis + node-cron
- **Frontend:** React 18 + Vite + Tailwind CSS + PWA (Web Push via injectManifest service worker)
- **Mobilapp:** React Native + Expo + LiveKit RN SDK + expo-notifications + notifee
- **Lyd-SFU:** LiveKit (WebRTC, Opus-codec, adaptiv bitrate) + LiveKit Ingress (klipp-avspilling)
- **Lagring:** MinIO (S3-kompatibel), eksponert offentlig via nginx-proxy
- **Proxy:** nginx
- **Infrastruktur:** Docker Compose
