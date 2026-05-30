const BASE = import.meta.env.VITE_API_URL ?? '/api'

async function request<T>(path: string, options?: RequestInit, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Request failed')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  register: (email: string, password: string, name?: string) =>
    request<{ token: string; user: { id: string; email: string; name?: string } }>(
      '/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }
    ),

  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string; name?: string } }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  getChannels: (token: string) =>
    request<any[]>('/channels', {}, token),

  createChannel: (token: string, name: string) =>
    request<any>('/channels', { method: 'POST', body: JSON.stringify({ name }) }, token),

  deleteChannel: (token: string, id: string) =>
    request<void>(`/channels/${id}`, { method: 'DELETE' }, token),

  getChannelToken: (token: string, channelId: string, role: 'speaker' | 'listener') =>
    request<{ token: string; roomName: string; channelKey: string }>(
      `/channels/${channelId}/token`, { method: 'POST', body: JSON.stringify({ role }) }, token
    ),

  joinByKey: (token: string, key: string) =>
    request<{ token: string; roomName: string; channelName: string }>(
      `/channels/join/${key}`, { method: 'POST' }, token
    ),

  getEvents: (token: string) =>
    request<any[]>('/events', {}, token),

  createEvent: (token: string, channelId: string, name: string) =>
    request<any>('/events', { method: 'POST', body: JSON.stringify({ channelId, name }) }, token),

  startEvent: (token: string, eventId: string, record: boolean, allowDownload: boolean) =>
    request<any>(`/events/${eventId}/start`, {
      method: 'POST', body: JSON.stringify({ record, allowDownload })
    }, token),

  stopEvent: (token: string, eventId: string) =>
    request<any>(`/events/${eventId}/stop`, { method: 'POST' }, token),

  getDownloadUrl: (token: string, eventId: string) =>
    request<{ url: string }>(`/events/${eventId}/download`, {}, token),
}
