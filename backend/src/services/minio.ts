import * as Minio from 'minio'

let client: Minio.Client | null = null

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
  const mc = getClient()
  return mc.presignedGetObject(BUCKET, objectPath, 24 * 60 * 60)
}
