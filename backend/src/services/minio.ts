import * as Minio from 'minio'

let client: Minio.Client | null = null
let publicClient: Minio.Client | null = null

// Brukes til admin-operasjoner (bucket-sjekk, sletting) som alltid skjer
// backend-til-backend inne i Docker-nettverket.
function getClient(): Minio.Client {
  if (!client) {
    client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT ?? 'minio',
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'ctminio',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'ctminiopassword',
    })
  }
  return client
}

// Brukes til å generere presignerte URL-er som eksterne klienter (mobilapp,
// nettleser) skal bruke direkte. Må peke på en offentlig nåbar adresse —
// det interne Docker-navnet "minio" løses ikke fra utsiden. I prod rutes
// dette gjennom nginx på curioustide.no (se nginx.prod.conf, location /recordings/).
function getPublicClient(): Minio.Client {
  if (!publicClient) {
    const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT ?? process.env.MINIO_ENDPOINT ?? 'minio'
    const useSSL = (process.env.MINIO_PUBLIC_USE_SSL ?? 'false') === 'true'
    publicClient = new Minio.Client({
      endPoint: publicEndpoint,
      port: Number(process.env.MINIO_PUBLIC_PORT ?? (useSSL ? 443 : 9000)),
      useSSL,
      accessKey: process.env.MINIO_ACCESS_KEY ?? 'ctminio',
      secretKey: process.env.MINIO_SECRET_KEY ?? 'ctminiopassword',
    })
  }
  return publicClient
}

const BUCKET = process.env.MINIO_BUCKET ?? 'recordings'

export async function ensureBucket(): Promise<void> {
  const mc = getClient()
  const exists = await mc.bucketExists(BUCKET)
  if (!exists) await mc.makeBucket(BUCKET)
}

export async function deleteObject(objectPath: string): Promise<void> {
  const mc = getClient()
  await mc.removeObject(BUCKET, objectPath)
}

export async function getDownloadUrl(objectPath: string): Promise<string> {
  const mc = getPublicClient()
  return mc.presignedGetObject(BUCKET, objectPath, 24 * 60 * 60)
}

export async function getUploadUrl(objectPath: string): Promise<string> {
  const mc = getPublicClient()
  return mc.presignedPutObject(BUCKET, objectPath, 60 * 60)
}
