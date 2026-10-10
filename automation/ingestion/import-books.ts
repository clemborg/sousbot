/**
 * Upsert cookbook titles into public.books for shelf / catalog pickers.
 * Optional pilot_shelf_links create recipe_book_refs (book_verified=false) so
 * "My cookbooks only" can be smoke-tested without implying cookbook membership on cards.
 *
 * Usage: tsx automation/ingestion/import-books.ts [--file books/fixtures/pilot-catalog.json] [--apply]
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { z } from 'zod';
import { books, recipeBookRefs, recipes } from '../../apps/web/lib/db/schema.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../..');

for (const envFile of [
  'apps/web/.env',
  'apps/web/.env.local',
  'apps/web/.env.vercel',
  'apps/web/.env.production.local',
]) {
  dotenv.config({ path: path.join(repoRoot, envFile) });
}
if (!process.env.DATABASE_URL && process.env.POSTGRES_URL) {
  process.env.DATABASE_URL = process.env.POSTGRES_URL;
}

const catalogSchema = z.object({
  pilot_shelf_links: z
    .array(z.object({ book_slug: z.string().min(1), recipe_slug: z.string().min(1) }))
    .optional(),
  items: z.array(z.object({ title: z.string().trim().min(1) })).min(1),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function parseArgs(argv: string[]): { file: string; apply: boolean } {
  let file = 'books/fixtures/pilot-catalog.json';
  let apply = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') apply = true;
    else if (arg === '--file' && argv[i + 1]) {
      file = argv[++i]!;
    }
  }
  return { file, apply };
}

async function main() {
  const { file, apply } = parseArgs(process.argv.slice(2));
  const absFile = path.isAbsolute(file) ? file : path.join(repoRoot, file);
  const raw = await readFile(absFile, 'utf8');
  const parsed = catalogSchema.parse(JSON.parse(raw));

  const links = parsed.pilot_shelf_links ?? [];

  if (!apply) {
    console.log(`[dry-run] Would upsert ${parsed.items.length} book(s) from ${file}`);
    for (const item of parsed.items) {
      console.log(`  - ${item.title} (${slugify(item.title)})`);
    }
    if (links.length) {
      console.log(`[dry-run] Would ensure ${links.length} pilot shelf link(s) (book_verified=false)`);
      for (const link of links) {
        console.log(`  - ${link.recipe_slug} ↔ ${link.book_slug}`);
      }
    }
    return;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL or POSTGRES_URL required for --apply');
  }

  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool);
  let inserted = 0;
  let existing = 0;
  let linksAdded = 0;

  try {
    for (const item of parsed.items) {
      const slug = slugify(item.title);
      if (!slug) continue;
      const found = await db.select({ id: books.id }).from(books).where(eq(books.slug, slug)).limit(1);
      if (found[0]) {
        existing++;
        continue;
      }
      await db.insert(books).values({ slug, title: item.title });
      inserted++;
    }

    for (const link of links) {
      const [bookRow] = await db
        .select({ id: books.id })
        .from(books)
        .where(eq(books.slug, link.book_slug))
        .limit(1);
      const [recipeRow] = await db
        .select({ id: recipes.id })
        .from(recipes)
        .where(eq(recipes.slug, link.recipe_slug))
        .limit(1);
      if (!bookRow || !recipeRow) {
        console.warn(`Skip pilot link (missing slug): ${link.recipe_slug} ↔ ${link.book_slug}`);
        continue;
      }
      const dup = await db
        .select({ id: recipeBookRefs.id })
        .from(recipeBookRefs)
        .where(
          and(eq(recipeBookRefs.recipeId, recipeRow.id), eq(recipeBookRefs.bookId, bookRow.id)),
        )
        .limit(1);
      if (dup[0]) continue;
      await db.insert(recipeBookRefs).values({
        recipeId: recipeRow.id,
        bookId: bookRow.id,
        bookVerified: false,
        pageVerified: false,
        evidenceUrl: 'pilot:shelf-qa',
      });
      linksAdded++;
    }
  } finally {
    await pool.end();
  }

  console.log(
    `Books: ${inserted} inserted, ${existing} already present (${parsed.items.length} in file). Pilot links added: ${linksAdded}.`,
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
