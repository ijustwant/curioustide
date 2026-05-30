import { AccessToken } from 'livekit-server-sdk'

interface TokenOptions {
  roomName: string
  participantIdentity: string
  participantName: string
  canPublish: boolean
  canSubscribe: boolean
}

export async function generateLivekitToken(opts: TokenOptions): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY ?? 'devkey'
  const apiSecret = process.env.LIVEKIT_API_SECRET ?? 'devsecret1234567890abcdef'

  const token = new AccessToken(apiKey, apiSecret, {
    identity: opts.participantIdentity,
    name: opts.participantName,
    ttl: '6h',
  })

  token.addGrant({
    room: opts.roomName,
    roomJoin: true,
    canPublish: opts.canPublish,
    canSubscribe: opts.canSubscribe,
    canPublishData: false,
  })

  return await token.toJwt()
}
