function required(...names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Configure ${names.join(' or ')} in environment variables`);
}

function defaultWebOrigin(): string {
  if (process.env.WEB_ORIGIN) return process.env.WEB_ORIGIN;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export type ServerEnv = {
  databaseUrl: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  webOrigin: string;
  isVercel: boolean;
};

export function loadServerEnv(): ServerEnv {
  return {
    databaseUrl: required('DATABASE_URL', 'POSTGRES_URL'),
    supabaseUrl: required('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'),
    supabasePublishableKey: required(
      'SUPABASE_PUBLISHABLE_KEY',
      'SUPABASE_ANON_KEY',
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    ),
    webOrigin: defaultWebOrigin(),
    isVercel: Boolean(process.env.VERCEL),
  };
}

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (!cachedEnv) cachedEnv = loadServerEnv();
  return cachedEnv;
}
