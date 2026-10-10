'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/recipes';
  return raw;
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Signing you in…');

  useEffect(() => {
    if (!supabase) {
      setMessage('Sign-in is not configured.');
      return;
    }
    const client = supabase;

    const next = safeNextPath(searchParams.get('next'));
    const code = searchParams.get('code');

    async function finish() {
      if (code) {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage('Sign-in link expired or invalid. Request a new link from the app.');
          return;
        }
      } else {
        const { error } = await client.auth.getSession();
        if (error) {
          setMessage('Could not restore session.');
          return;
        }
      }
      router.replace(next);
    }

    void finish();
  }, [router, searchParams]);

  return (
    <main className="site-shell" style={{ padding: '2rem', maxWidth: 480 }}>
      <p>{message}</p>
    </main>
  );
}
