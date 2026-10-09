function required(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(
    `Configure ${names.join(' or ')} in apps/api/.env (or Vercel project env)`,
  );
}

function defaultWebOrigin(): string {
  if (process.env.WEB_ORIGIN) return process.env.WEB_ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:5173';
}

export type ApiEnv = {
  databaseUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  webOrigin: string;
  isVercel: boolean;
  port: number;
};

export function loadApiEnv(): ApiEnv {
  return {
    databaseUrl: required('DATABASE_URL', 'POSTGRES_URL'),
    supabaseUrl: required('SUPABASE_URL'),
    supabasePublishableKey: required('SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_ANON_KEY'),
    webOrigin: defaultWebOrigin(),
    isVercel: Boolean(process.env.VERCEL),
    port: Number(process.env.PORT ?? 4000),
  };
}

let cachedEnv: ApiEnv | undefined;

/** Loads and caches env; throws if required variables are missing. */
export function getApiEnv(): ApiEnv {
  if (!cachedEnv) cachedEnv = loadApiEnv();
  return cachedEnv;
}
