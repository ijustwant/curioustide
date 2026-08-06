const BASE = 'https://curioustide.no/api'

async function request<T>(path: string, options?: RequestInit, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  }
  if (options?.body) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, { ...options, headers })
  } catch (networkErr: any) {
    throw new Error(`Nettverksfeil: ${networkErr.message}\nURL: ${BASE}${path}`)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}\n${body}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string; name?: string } }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  forgotPassword: (email: string) =>
    request<{ ok: boolean }>(
      '/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }
    ),

  register: (email: string, password: string, name?: string) =>
    request<{ token: string; user: { id: string; email: string; name?: string } }>(
      '/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }
    ),

  getChannels: (token: string) =>
    request<any[]>('/channels', {}, token),

  getChannelToken: (token: string, channelId: string, role: 'speaker' | 'listener') =>
    request<{ token: string; roomName: string; channelKey: string }>(
      `/channels/${channelId}/token`, { method: 'POST', body: JSON.stringify({ role }) }, token
    ),

  createChannel: (token: string, name: string) =>
    request<any>('/channels', { method: 'POST', body: JSON.stringify({ name }) }, token),

  createChannelWithPlan: (token: string, name: string, plan: string) =>
    request<{ url?: string; adminBypass?: boolean; channel?: any }>(
      '/payments/checkout', { method: 'POST', body: JSON.stringify({ name, plan }) }, token
    ),

  deleteChannel: (token: string, id: string) =>
    request<void>(`/channels/${id}`, { method: 'DELETE' }, token),

  joinByKey: (token: string, key: string) =>
    request<{ token: string; roomName: string; channelName: string; channelId: string }>(
      `/channels/join/${key}`, { method: 'POST', body: JSON.stringify({}) }, token
    ),

  getInvites: (token: string) =>
    request<{ pending: any[]; shared: any[] }>('/channels/invites', {}, token),

  inviteSpeaker: (token: string, channelId: string, email: string) =>
    request<{ ok: boolean }>(`/channels/${channelId}/invite`, { method: 'POST', body: JSON.stringify({ email }) }, token),

  acceptInvite: (token: string, inviteId: string) =>
    request<{ ok: boolean }>(`/channels/invites/${inviteId}/accept`, { method: 'POST' }, token),

  registerPushToken: (token: string, expoToken: string, platform: 'ios' | 'android') =>
    request<{ ok: boolean }>('/push/register', { method: 'POST', body: JSON.stringify({ expoToken, platform }) }, token),

  subscribeToChannelNotifications: (token: string, channelId: string) =>
    request<{ ok: boolean }>(`/channels/${channelId}/subscribe`, { method: 'POST' }, token),

  notifyChannel: (token: string, channelId: string, message: string) =>
    request<{ ok: boolean; recipients: number }>(
      `/channels/${channelId}/notify`, { method: 'POST', body: JSON.stringify({ message }) }, token
    ),

  // Intervju-klipp
  getClipUploadUrl: (token: string, channelId: string) =>
    request<{ uploadUrl: string; objectPath: string }>(
      `/channels/${channelId}/clips/upload-url`, { method: 'POST' }, token
    ),

  createClip: (token: string, channelId: string, objectPath: string, durationMs?: number, name?: string) =>
    request<InterviewClip>(
      `/channels/${channelId}/clips`,
      { method: 'POST', body: JSON.stringify({ objectPath, durationMs, name }) },
      token
    ),

  getClips: (token: string, channelId: string) =>
    request<InterviewClip[]>(`/channels/${channelId}/clips`, {}, token),

  renameClip: (token: string, channelId: string, clipId: string, name: string) =>
    request<InterviewClip>(
      `/channels/${channelId}/clips/${clipId}`,
      { method: 'PATCH', body: JSON.stringify({ name }) },
      token
    ),

  playClip: (token: string, channelId: string, clipId: string) =>
    request<{ ok: boolean; ingressId?: string }>(
      `/channels/${channelId}/clips/${clipId}/play`, { method: 'POST' }, token
    ),

  deleteClip: (token: string, channelId: string, clipId: string) =>
    request<void>(`/channels/${channelId}/clips/${clipId}`, { method: 'DELETE' }, token),
}

export type InterviewClip = {
  id: string
  channelId: string
  name: string
  objectPath: string
  durationMs: number | null
  createdAt: string
}
