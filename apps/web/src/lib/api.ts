import { supabase, apiBase } from './supabase';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set('Content-Type', 'application/json');
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (session?.access_token) headers.set('Authorization', 'Bearer ' + session.access_token);
  const res = await fetch(apiBase + '/api/v1' + path, { ...init, headers });
  if (!res.ok) {
    const body: { error?: string } = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Request failed (' + res.status + ')');
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
