import { EgressClient, EncodedFileOutput, EncodedFileType, S3Upload } from 'livekit-server-sdk'
import type { PrismaClient } from '@prisma/client'
import { deleteObject } from './minio'

function getEgressClient(): EgressClient {
  return new EgressClient(
    process.env.LIVEKIT_HOST ?? 'http://livekit:7880',
    process.env.LIVEKIT_API_KEY ?? 'devkey',
    process.env.LIVEKIT_API_SECRET ?? 'devsecret1234567890abcdef'
  )
}

export async function startRecording(roomName: string, eventId: string): Promise<string> {
  const egress = getEgressClient()
  const objectPath = `events/${eventId}/recording.ogg`

  const s3 = new S3Upload({
    accessKey: process.env.MINIO_ACCESS_KEY ?? 'ctminio',
    secret: process.env.MINIO_SECRET_KEY ?? 'ctminiopassword',
    bucket: process.env.MINIO_BUCKET ?? 'recordings',
    endpoint: `http://${process.env.MINIO_ENDPOINT ?? 'minio'}:${process.env.MINIO_PORT ?? 9000}`,
    forcePathStyle: true,
  })

  const output = new EncodedFileOutput({
    fileType: EncodedFileType.OGG,
    filepath: objectPath,
    output: { case: 's3', value: s3 },
  })

  await egress.startRoomCompositeEgress(roomName, { file: output })
  return objectPath
}

export async function stopRecording(roomName: string): Promise<void> {
  const egress = getEgressClient()
  const active = await egress.listEgress({ roomName, active: true })
  for (const e of active) {
    if (e.egressId) await egress.stopEgress(e.egressId)
  }
}

export async function deleteExpiredRecordings(prisma: PrismaClient): Promise<void> {
  const expired = await prisma.event.findMany({
    where: {
      recordingPath: { not: null },
      recordingExpiresAt: { lt: new Date() },
    },
  })

  for (const event of expired) {
    if (event.recordingPath) {
      try {
        await deleteObject(event.recordingPath)
      } catch {
        // Object may already be gone
      }
    }
    await prisma.event.update({
      where: { id: event.id },
      data: { recordingPath: null, recordingExpiresAt: null },
    })
  }
}
