import { Suspense } from 'react';
import { AuthCallbackClient } from './AuthCallbackClient';

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<main className="site-shell" style={{ padding: '2rem' }}><p>Signing you in…</p></main>}>
      <AuthCallbackClient />
    </Suspense>
  );
}
