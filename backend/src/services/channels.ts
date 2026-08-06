import type { PrismaClient } from '@prisma/client'
import { deleteObject } from './minio'

export async function deleteExpiredChannels(prisma: PrismaClient): Promise<void> {
  const expired = await prisma.channel.findMany({
    where: { expiresAt: { lt: new Date() } },
    include: { events: true, clips: true },
  })

  for (const channel of expired) {
    for (const event of channel.events) {
      if (event.recordingPath) {
        try {
          await deleteObject(event.recordingPath)
        } catch {
          // Object may already be gone
        }
      }
    }
    for (const clip of channel.clips) {
      try {
        await deleteObject(clip.objectPath)
      } catch {
        // Object may already be gone
      }
    }
    // ChannelInvite-, Event- og InterviewClip-rader ryddes automatisk via onDelete: Cascade
    await prisma.channel.delete({ where: { id: channel.id } })
  }
}
