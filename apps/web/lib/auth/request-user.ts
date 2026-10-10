import { getSupabaseAdmin } from '@/lib/supabase-server';

export type AuthResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

export async function optionalUserId(request: Request): Promise<string | undefined> {
  const h = request.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return undefined;
  const { data, error } = await getSupabaseAdmin().auth.getUser(h.slice(7));
  if (error || !data.user) return undefined;
  return data.user.id;
}

export async function requireUserId(request: Request): Promise<AuthResult> {
  const h = request.headers.get('authorization');
  if (!h) {
    return {
      ok: false,
      response: Response.json({ error: 'Sign in to save your cooking history' }, { status: 401 }),
    };
  }
  if (!h.startsWith('Bearer ')) {
    return {
      ok: false,
      response: Response.json({ error: 'Invalid authorization header' }, { status: 401 }),
    };
  }
  const { data, error } = await getSupabaseAdmin().auth.getUser(h.slice(7));
  if (error || !data.user) {
    return {
      ok: false,
      response: Response.json({ error: 'Invalid or expired session' }, { status: 401 }),
    };
  }
  return { ok: true, userId: data.user.id };
}

export async function userIdFromBearerOr401(request: Request): Promise<string | Response> {
  const auth = await requireUserId(request);
  if (!auth.ok) return auth.response;
  return auth.userId;
}
