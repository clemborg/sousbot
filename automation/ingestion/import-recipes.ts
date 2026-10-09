/**
 * Import recipe JSON from the Sousbot Git archive (recipes/) into Postgres.
 * Usage: tsx automation/ingestion/import-recipes.ts [--dir recipes] [--apply] [--publish] [--limit N]
 */
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { Pool } from 'pg';
import { z } from 'zod';
import {
  authors,
  bookEditions,
  books,
  recipeAuthors,
  recipeBookRefs,
  recipeIngredients,
  recipeProvenance,
  recipeSources,
  recipes,
} from '../../apps/api/src/db/schema.ts';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../..');

dotenv.config({ path: path.join(repoRoot, 'apps/api/.env') });

const legacyRecipeSchema = z.object({
  slug: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1),
  author: z.union([z.string(), z.array(z.string())]).optional(),
  authors: z.array(z.string()).optional(),
  servings: z.string().optional(),
  ingredients: z.union([z.array(z.string()), z.string()]),
  directions: z.union([z.array(z.string()), z.string()]).optional(),
  method: z.union([z.array(z.string()), z.string()]).optional(),
  source_url: z.string().url().optional(),
  sourceUrl: z.string().url().optional(),
  source_validation: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  cookbook: z.string().optional(),
  page: z.number().int().positive().optional(),
  cookbook_verified: z.boolean().optional(),
  book_verified: z.boolean().optional(),
  page_verified: z.boolean().optional(),
  evidence_url: z.string().url().optional(),
  directions_display_authorized: z.boolean().optional(),
  display_directions: z.boolean().optional(),
  _meta: z.object({ publish: z.boolean().optional() }).optional(),
});

type CliOptions = {
  dir: string;
  apply: boolean;
  publish: boolean;
  limit?: number;
};

type RunLog = {
  startedAt: string;
  dir: string;
  apply: boolean;
  publish: boolean;
  files: { path: string; action: string; slug?: string; error?: string }[];
  summary: { scanned: number; skipped: number; imported: number; published: number; failed: number };
};

function parseArgs(argv: string[]): CliOptions {
  let dir = 'recipes';
  let apply = false;
  let publish = false;
  let limit: number | undefined;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') apply = true;
    else if (arg === '--publish') publish = true;
    else if (arg === '--dry-run') apply = false;
    else if (arg === '--dir' && argv[i + 1]) {
      dir = argv[++i]!;
    } else if (arg === '--limit' && argv[i + 1]) {
      limit = Number(argv[++i]);
    }
  }
  if (publish && !apply) {
    throw new Error('--publish requires --apply');
  }
  return { dir, apply, publish, limit };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function collectJsonFiles(absDir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.endsWith('.json')) out.push(full);
    }
  }
  await walk(absDir);
  return out.sort();
}

function ingredientLines(raw: string | string[]): string[] {
  if (Array.isArray(raw)) return raw.map(x => x.trim()).filter(Boolean);
  return raw
    .split('\n')
    .map(x => x.trim())
    .filter(Boolean);
}

function directionSteps(raw: string | string[] | undefined): string[] | null {
  if (!raw) return null;
  const lines = Array.isArray(raw) ? raw : raw.split('\n');
  const steps = lines.map(x => x.trim()).filter(Boolean);
  return steps.length ? steps : null;
}

function authorNames(record: z.infer<typeof legacyRecipeSchema>): string[] {
  if (record.authors?.length) return record.authors.map(x => x.trim()).filter(Boolean);
  if (typeof record.author === 'string' && record.author.trim()) return [record.author.trim()];
  if (Array.isArray(record.author)) return record.author.map(x => x.trim()).filter(Boolean);
  return [];
}

function sourceUrl(record: z.infer<typeof legacyRecipeSchema>): string | null {
  return record.source_url ?? record.sourceUrl ?? null;
}

function normalizeIngredientName(line: string): string {
  return line.toLowerCase().replace(/\s+/g, ' ').trim();
}

function passesPublishGate(record: z.infer<typeof legacyRecipeSchema>, ingredients: string[]): boolean {
  return Boolean(sourceUrl(record)) && ingredients.length > 0;
}

async function ensureAuthor(db: ReturnType<typeof drizzle>, name: string): Promise<string> {
  const slug = slugify(name) || 'author';
  const existing = await db.select({ id: authors.id }).from(authors).where(eq(authors.slug, slug)).limit(1);
  if (existing[0]) return existing[0].id;
  const [row] = await db.insert(authors).values({ slug, name }).returning({ id: authors.id });
  if (!row) throw new Error('Failed to insert author');
  return row.id;
}

async function replaceRecipeChildren(
  db: ReturnType<typeof drizzle>,
  recipeId: string,
  record: z.infer<typeof legacyRecipeSchema>,
  ingredients: string[],
) {
  await db.delete(recipeAuthors).where(eq(recipeAuthors.recipeId, recipeId));
  await db.delete(recipeIngredients).where(eq(recipeIngredients.recipeId, recipeId));
  await db.delete(recipeSources).where(eq(recipeSources.recipeId, recipeId));
  await db.delete(recipeBookRefs).where(eq(recipeBookRefs.recipeId, recipeId));

  const names = authorNames(record);
  for (const name of names) {
    const authorId = await ensureAuthor(db, name);
    await db.insert(recipeAuthors).values({ recipeId, authorId }).onConflictDoNothing();
  }

  for (let i = 0; i < ingredients.length; i++) {
    const raw = ingredients[i]!;
    await db.insert(recipeIngredients).values({
      recipeId,
      ordinal: i,
      rawText: raw,
      normalizedName: normalizeIngredientName(raw),
      importance: 'supporting',
    });
  }

  const url = sourceUrl(record);
  if (url) {
    await db.insert(recipeSources).values({ recipeId, url, kind: 'web' });
  }

  const bookVerified = record.book_verified ?? record.cookbook_verified ?? false;
  if (record.cookbook && bookVerified) {
    const bookSlug = slugify(record.cookbook);
    let bookId: string;
    const found = await db.select({ id: books.id }).from(books).where(eq(books.slug, bookSlug)).limit(1);
    if (found[0]) bookId = found[0].id;
    else {
      const [b] = await db.insert(books).values({ slug: bookSlug, title: record.cookbook }).returning({ id: books.id });
      if (!b) throw new Error('Failed to insert book');
      bookId = b.id;
    }

    let editionId: string | null = null;
    const pageVerified = Boolean(record.page_verified && record.page);
    if (pageVerified) {
      const evidence = record.evidence_url ?? url;
      if (!evidence) throw new Error('page_verified requires evidence_url or source URL');
      const [edition] = await db
        .insert(bookEditions)
        .values({ bookId, label: 'imported edition' })
        .returning({ id: bookEditions.id });
      if (!edition) throw new Error('Failed to insert edition');
      editionId = edition.id;
      await db.insert(recipeBookRefs).values({
        recipeId,
        bookId,
        editionId,
        page: record.page ?? null,
        bookVerified: true,
        pageVerified: true,
        evidenceUrl: evidence,
      });
    } else {
      await db.insert(recipeBookRefs).values({
        recipeId,
        bookId,
        bookVerified: true,
        pageVerified: false,
        page: null,
      });
    }
  }
}

async function importFile(
  db: ReturnType<typeof drizzle>,
  absPath: string,
  originPath: string,
  contentSha: string,
  publish: boolean,
  apply: boolean,
): Promise<{ action: string; slug: string; error?: string }> {
  const bytes = await readFile(absPath);
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (sha !== contentSha) {
    return { action: 'failed', slug: '', error: 'SHA mismatch on read' };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(bytes.toString('utf8'));
  } catch {
    return { action: 'failed', slug: '', error: 'Invalid JSON' };
  }

  const parsed = legacyRecipeSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { action: 'failed', slug: '', error: parsed.error.message };
  }
  const record = parsed.data;
  const slug = record.slug?.trim() || slugify(record.title);
  if (!slug) return { action: 'failed', slug: '', error: 'Could not derive slug' };

  const ingredients = ingredientLines(record.ingredients);
  if (!ingredients.length) return { action: 'failed', slug, error: 'No ingredients' };

  const directions = directionSteps(record.directions ?? record.method);
  const displayAuthorized = Boolean(record.directions_display_authorized ?? record.display_directions);
  const wantsPublish = publish && passesPublishGate(record, ingredients) && (record._meta?.publish ?? true);

  const existingProv = await db
    .select()
    .from(recipeProvenance)
    .where(eq(recipeProvenance.originPath, originPath))
    .limit(1);

  if (existingProv[0]?.contentSha === contentSha) {
    return { action: 'skipped_unchanged', slug };
  }

  if (!apply) {
    return { action: wantsPublish ? 'would_publish' : 'would_import_draft', slug };
  }

  const status = wantsPublish ? 'published' : 'draft';
  const directionsDisplayPolicy = displayAuthorized && directions ? 'authorized' : 'source_only';

  let recipeId: string;

  if (existingProv[0]) {
    recipeId = existingProv[0].recipeId;
    await db
      .update(recipes)
      .set({
        slug,
        title: record.title,
        servings: record.servings ?? null,
        directions: directionsDisplayPolicy === 'authorized' ? directions : null,
        directionsDisplayPolicy,
        status,
        updatedAt: new Date(),
      })
      .where(eq(recipes.id, recipeId));
    await db
      .update(recipeProvenance)
      .set({ contentSha, importedAt: new Date() })
      .where(eq(recipeProvenance.recipeId, recipeId));
  } else {
    const bySlug = await db.select({ id: recipes.id }).from(recipes).where(eq(recipes.slug, slug)).limit(1);
    if (bySlug[0]) {
      recipeId = bySlug[0].id;
      await db
        .update(recipes)
        .set({
          title: record.title,
          servings: record.servings ?? null,
          directions: directionsDisplayPolicy === 'authorized' ? directions : null,
          directionsDisplayPolicy,
          status,
          updatedAt: new Date(),
        })
        .where(eq(recipes.id, recipeId));
    } else {
      const [inserted] = await db
        .insert(recipes)
        .values({
          slug,
          title: record.title,
          servings: record.servings ?? null,
          directions: directionsDisplayPolicy === 'authorized' ? directions : null,
          directionsDisplayPolicy,
          status,
        })
        .returning({ id: recipes.id });
      if (!inserted) throw new Error('Failed to insert recipe');
      recipeId = inserted.id;
    }
    await db
      .insert(recipeProvenance)
      .values({ recipeId, originPath, contentSha })
      .onConflictDoUpdate({
        target: recipeProvenance.originPath,
        set: { contentSha, importedAt: new Date(), recipeId },
      });
  }

  await replaceRecipeChildren(db, recipeId, record, ingredients);

  return { action: status === 'published' ? 'published' : 'imported_draft', slug };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const absDir = path.resolve(repoRoot, opts.dir);
  const files = await collectJsonFiles(absDir);
  const limited = opts.limit ? files.slice(0, opts.limit) : files;

  const log: RunLog = {
    startedAt: new Date().toISOString(),
    dir: opts.dir,
    apply: opts.apply,
    publish: opts.publish,
    files: [],
    summary: { scanned: limited.length, skipped: 0, imported: 0, published: 0, failed: 0 },
  };

  let pool: Pool | null = null;
  let db: ReturnType<typeof drizzle> | null = null;

  if (opts.apply) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('DATABASE_URL is required for --apply. Set it in apps/api/.env');
      process.exit(1);
    }
    pool = new Pool({ connectionString: databaseUrl, max: 3 });
    db = drizzle({ client: pool });
  }

  for (const absPath of limited) {
    const originPath = path.relative(repoRoot, absPath).split(path.sep).join('/');
    const bytes = await readFile(absPath);
    const contentSha = createHash('sha256').update(bytes).digest('hex');

    try {
      if (!db) {
        const parsed = legacyRecipeSchema.safeParse(JSON.parse(bytes.toString('utf8')));
        if (!parsed.success) {
          log.files.push({ path: originPath, action: 'failed', error: parsed.error.message });
          log.summary.failed++;
          continue;
        }
        const slug = parsed.data.slug?.trim() || slugify(parsed.data.title);
        const ingredients = ingredientLines(parsed.data.ingredients);
        const wouldPublish =
          opts.publish && passesPublishGate(parsed.data, ingredients) && (parsed.data._meta?.publish ?? true);
        const action = wouldPublish ? 'would_publish' : 'would_import_draft';
        log.files.push({ path: originPath, action, slug });
        log.summary.imported++;
        if (wouldPublish) log.summary.published++;
        continue;
      }

      const result = await importFile(db, absPath, originPath, contentSha, opts.publish, opts.apply);
      log.files.push({ path: originPath, action: result.action, slug: result.slug, error: result.error });
      if (result.action === 'skipped_unchanged') log.summary.skipped++;
      else if (result.action === 'failed') log.summary.failed++;
      else if (result.action === 'published') {
        log.summary.imported++;
        log.summary.published++;
      } else if (result.action === 'imported_draft' || result.action === 'would_import_draft') {
        log.summary.imported++;
      }
    } catch (err) {
      log.files.push({
        path: originPath,
        action: 'failed',
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      log.summary.failed++;
    }
  }

  const runsDir = path.join(repoRoot, 'ingestion/runs');
  await mkdir(runsDir, { recursive: true });
  const runFile = path.join(runsDir, `import-${log.startedAt.replace(/[:.]/g, '-')}.json`);
  await writeFile(runFile, JSON.stringify(log, null, 2), 'utf8');

  console.log(JSON.stringify(log.summary, null, 2));
  console.log('Run log:', path.relative(repoRoot, runFile));

  if (pool) await pool.end();
  if (log.summary.failed > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
