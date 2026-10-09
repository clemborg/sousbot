import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getApiEnv } from '../config/env';

let supabaseClient: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    const env = getApiEnv();
    supabaseClient = createClient(env.supabaseUrl, env.supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return supabaseClient;
}
