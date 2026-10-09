import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export const supabase =
  supabaseUrl && supabaseKey && !supabaseKey.startsWith('replace_')
    ? createClient(supabaseUrl, supabaseKey)
    : null;

export const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
