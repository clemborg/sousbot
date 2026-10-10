/** Origin used for Supabase magic-link redirects (matches Supabase URL Configuration). */
export function getAuthRedirectOrigin(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (site) return site;
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL;
  if (vercel) return vercel.startsWith('http') ? vercel.replace(/\/$/, '') : `https://${vercel.replace(/\/$/, '')}`;
  return 'http://localhost:3000';
}

export function authCallbackUrl(nextPath?: string): string {
  const origin = getAuthRedirectOrigin();
  const path = nextPath && nextPath.startsWith('/') ? nextPath : '/recipes';
  return `${origin}/auth/callback?next=${encodeURIComponent(path)}`;
}
