const BASE = __DEV__ ? 'http://10.0.2.2:4000' : 'https://your-domain.com/api'

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
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: string; email: string; name?: string } }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }
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

  joinByKey: (token: string, key: string) =>
    request<{ token: string; roomName: string; channelName: string }>(
      `/channels/join/${key}`, { method: 'POST' }, token
    ),
}
