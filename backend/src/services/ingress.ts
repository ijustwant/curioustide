import { IngressClient, IngressInput, type IngressInfo } from 'livekit-server-sdk'

function getIngressClient(): IngressClient {
  return new IngressClient(
    process.env.LIVEKIT_HOST ?? 'http://livekit:7880',
    process.env.LIVEKIT_API_KEY ?? 'devkey',
    process.env.LIVEKIT_API_SECRET ?? 'devsecret1234567890abcdef'
  )
}

// Spiller en lydfil (via URL) inn i et aktivt LiveKit-rom, som om den var en deltaker.
// Brukes til å spille av intervju-klipp live inn i en pågående sending.
export async function playClipIntoRoom(
  roomName: string,
  clipUrl: string,
  participantName: string
): Promise<IngressInfo> {
  const ingress = getIngressClient()
  return ingress.createIngress(IngressInput.URL_INPUT, {
    name: `clip-${Date.now()}`,
    roomName,
    participantIdentity: `clip:${Date.now()}`,
    participantName,
    url: clipUrl,
  })
}
