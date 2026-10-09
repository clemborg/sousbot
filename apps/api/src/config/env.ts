function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Configure ${name} in apps/api/.env (or Vercel project env)`);
  }
  return value;
}

export function loadApiEnv() {
  return {
    databaseUrl: required('DATABASE_URL'),
    supabaseUrl: required('SUPABASE_URL'),
    supabasePublishableKey: required('SUPABASE_PUBLISHABLE_KEY'),
    webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    isVercel: Boolean(process.env.VERCEL),
    port: Number(process.env.PORT ?? 4000),
  };
}
