export const AUTH_INTENT_KEY = 'sousbot:pending-auth-intent';

export type AuthIntent = {
  view: 'discover' | 'books';
  recipeSlug: string | null;
  bookId: string | null;
  cookedOn: string;
  notes: string;
};

export function readAuthIntent(): AuthIntent | null {
  try {
    const raw = sessionStorage.getItem(AUTH_INTENT_KEY);
    return raw ? (JSON.parse(raw) as AuthIntent) : null;
  } catch {
    return null;
  }
}

export function writeAuthIntent(intent: AuthIntent) {
  try {
    sessionStorage.setItem(AUTH_INTENT_KEY, JSON.stringify(intent));
  } catch {
    /* private browsing may block storage */
  }
}

export function clearAuthIntent() {
  try {
    sessionStorage.removeItem(AUTH_INTENT_KEY);
  } catch {
    /* ignore */
  }
}
