'use client';

import { Suspense } from 'react';
import { SousbotApp } from '@/components/SousbotApp';

export function SousbotPage({ recipeSlug }: { recipeSlug?: string }) {
  return (
    <Suspense fallback={<div className="empty site-shell">Loading Sousbot…</div>}>
      <SousbotApp recipeSlug={recipeSlug} />
    </Suspense>
  );
}
