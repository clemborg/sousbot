import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/server-app.ts' },
  format: ['cjs'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  external: ['pg'],
  noExternal: [/^@sousbot\//, 'express', 'cors', 'drizzle-orm', 'zod', '@supabase/supabase-js'],
  esbuildOptions(options) {
    options.banner = {
      js: 'var __import_meta_url=require("url").pathToFileURL(__filename).href;',
    };
    options.define = {
      ...(options.define ?? {}),
      'import.meta.url': '__import_meta_url',
    };
  },
});
