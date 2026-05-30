# CuriousTide

Lav-latens lyd-streaming tjeneste for arrangementer. Én sender (med Bluetooth-mikrofon) distribuerer lyd til mange lyttere via mobil/nettleser med ~20–100ms forsinkelse.

## Arkitektur

```
nginx (port 80)
  ├── /api         → backend Fastify (port 4000)
  ├── /livekit     → LiveKit SFU (port 7880)
  └── /            → frontend React PWA (port 3000)

PostgreSQL (5432) · Redis (6379) · MinIO (9000/9001)
```

**Lyd-transport:** LiveKit WebRTC SFU med Opus-codec (adaptiv bitrate 6–510 kbps, ~20–100ms latens)

## Kom i gang

### 1. Konfigurer miljøvariabler

```bash
cp .env.example .env
# Rediger .env — endre alle passord og secrets
```

### 2. Start alle tjenester

```bash
docker compose up --build
```

Åpne `http://localhost` i nettleseren.

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
| `backend/` | Fastify API, Prisma ORM, LiveKit token-service, opptak |
| `frontend/` | React 18 + Vite + Tailwind PWA |
| `mobile/` | React Native + Expo (Android + iOS) |
| `livekit/` | LiveKit SFU konfigurasjon |
| `nginx/` | Reverse proxy |

## Backend API

Alle endepunkter krever `Authorization: Bearer <JWT>` unntatt `/auth/register` og `/auth/login`.

| Metode | Sti | Beskrivelse |
|--------|-----|-------------|
| POST | `/auth/register` | Opprett konto |
| POST | `/auth/login` | Logg inn, returner JWT |
| GET | `/auth/me` | Hent innlogget bruker |
| GET | `/channels` | Hent egne kanaler |
| POST | `/channels` | Opprett kanal |
| DELETE | `/channels/:id` | Slett kanal |
| POST | `/channels/:id/token` | Hent LiveKit-token (role: speaker/listener) |
| POST | `/channels/join/:key` | Lytter-token via kanal-ID |
| GET | `/events` | Hent egne arrangementer |
| POST | `/events` | Opprett arrangement |
| POST | `/events/:id/start` | Start arrangement (evt. opptak) |
| POST | `/events/:id/stop` | Stopp arrangement |
| GET | `/events/:id/download` | Signert nedlastings-URL |

## Mobilapp (Android-testing via USB)

```bash
cd mobile
npm install

# Generer native Android-prosjekt (kjøres én gang)
npx expo prebuild --platform android

# Koble til Android-telefon via USB med USB-feilsøking aktivert
# Innstillinger → Om telefonen → Trykk "Byggnummer" 7 ganger → Utviklervalg → USB-feilsøking

# Bekreft at telefonen er synlig
adb devices

# Bygg og installer på telefon
npx expo run:android
```

### iOS (krever Mac med Xcode)

```bash
npx expo prebuild --platform ios
npx expo run:ios
```

## Konfigurasjon

Viktige `.env`-variabler:

| Variabel | Beskrivelse |
|----------|-------------|
| `LIVEKIT_API_KEY` | LiveKit API-nøkkel (sett også i `livekit/livekit.yaml`) |
| `LIVEKIT_API_SECRET` | LiveKit API-hemmelighet (min 32 tegn) |
| `JWT_SECRET` | JWT-signeringshemmelighet (min 32 tegn) |
| `MAX_FREE_CHANNELS` | Maks kanaler per bruker (0 = ubegrenset) |

**Viktig:** `livekit/livekit.yaml` har hardkodede dev-verdier. I produksjon — bytt ut `devkey`/`devsecret` med verdiene fra `.env`.

## Opptak

- Opptak startes ved å velge "Start opptak" når et arrangement opprettes
- Filer lagres i MinIO-bucket `recordings` som OGG/Opus
- Slettes automatisk etter 30 dager (daglig cron-jobb kl. 03:00)
- Nedlasting via signert URL (24t gyldighet) tilgjengelig om `allowDownload: true`

## Produksjon

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Husk å:
1. Sette opp SSL (La oss kryptere / nginx-certbot)
2. Endre `VITE_LIVEKIT_URL` til `wss://ditt-domene.no/livekit`
3. I mobilapp: endre `LIVEKIT_URL` og `BASE` URL i `mobile/src/services/api.ts`
4. Åpne UDP-porter 50100–50200 i brannmur (kreves av LiveKit for WebRTC)

## Teknologistack

- **Backend:** Node.js 22 + Fastify + TypeScript + Prisma + PostgreSQL + Redis
- **Frontend:** React 18 + Vite + Tailwind CSS + PWA
- **Mobilapp:** React Native + Expo + LiveKit RN SDK
- **Lyd-SFU:** LiveKit (WebRTC, Opus-codec, adaptiv bitrate)
- **Lagring:** MinIO (S3-kompatibel)
- **Proxy:** nginx
- **Infrastruktur:** Docker Compose
