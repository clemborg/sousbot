import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getServerEnv } from '@/lib/env';

let supabaseClient: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseClient) {
    const env = getServerEnv();
    supabaseClient = createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseClient;
}
