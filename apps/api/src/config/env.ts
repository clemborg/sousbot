function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Configure ${name} in apps/api/.env (or Vercel project env)`);
  }
  return value;
}

function defaultWebOrigin(): string {
  if (process.env.WEB_ORIGIN) return process.env.WEB_ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:5173';
}

export function loadApiEnv() {
  return {
    databaseUrl: required('DATABASE_URL'),
    supabaseUrl: required('SUPABASE_URL'),
    supabasePublishableKey: required('SUPABASE_PUBLISHABLE_KEY'),
    webOrigin: defaultWebOrigin(),
    isVercel: Boolean(process.env.VERCEL),
    port: Number(process.env.PORT ?? 4000),
  };
}
