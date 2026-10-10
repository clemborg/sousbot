import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/server-app.ts' },
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  external: ['pg'],
  noExternal: [/^@sousbot\//, 'express', 'cors', 'dotenv', 'drizzle-orm', 'zod', '@supabase/supabase-js'],
});
