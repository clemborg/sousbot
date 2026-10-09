import { createClient } from '@supabase/supabase-js';
import { loadApiEnv } from '../config/env';

const env = loadApiEnv();

export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
