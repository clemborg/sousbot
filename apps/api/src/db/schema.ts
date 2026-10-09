import {
  pgSchema, pgTable, uuid, text, integer, boolean, date, timestamp, jsonb,
  primaryKey, index, uniqueIndex,
} from 'drizzle-orm/pg-core';

const auth = pgSchema('auth');
export const authUsers = auth.table('users', { id: uuid('id').primaryKey() });

export const authors = pgTable('authors', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
});
export const recipes = pgTable('recipes', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  servings: text('servings'),
  directions: jsonb('directions').$type<string[] | null>(),
  directionsDisplayPolicy: text('directions_display_policy').notNull().default('source_only'),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
export const recipeAuthors = pgTable('recipe_authors', {
  recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => authors.id, { onDelete: 'cascade' }),
}, t => [primaryKey({ columns: [t.recipeId, t.authorId] })]);
export const recipeIngredients = pgTable('recipe_ingredients', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  ordinal: integer('ordinal').notNull(),
  rawText: text('raw_text').notNull(),
  normalizedName: text('normalized_name'),
  importance: text('importance').notNull().default('supporting'),
}, t => [index('recipe_ingredients_recipe_idx').on(t.recipeId), index('recipe_ingredients_name_idx').on(t.normalizedName)]);
export const books = pgTable('books', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
});
export const bookEditions = pgTable('book_editions', {
  id: uuid('id').defaultRandom().primaryKey(),
  bookId: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  isbn13: text('isbn13').unique(),
  label: text('label'),
  publicationYear: integer('publication_year'),
});
export const recipeBookRefs = pgTable('recipe_book_refs', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  bookId: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  editionId: uuid('edition_id').references(() => bookEditions.id),
  page: integer('page'),
  bookVerified: boolean('book_verified').notNull().default(false),
  pageVerified: boolean('page_verified').notNull().default(false),
  evidenceUrl: text('evidence_url'),
}, t => [index('recipe_book_refs_recipe_idx').on(t.recipeId), index('recipe_book_refs_book_idx').on(t.bookId)]);
export const recipeSources = pgTable('recipe_sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  kind: text('kind').notNull().default('web'),
});
export const userBooks = pgTable('user_books', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  bookId: uuid('book_id').notNull().references(() => books.id, { onDelete: 'cascade' }),
  editionId: uuid('edition_id').references(() => bookEditions.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [index('user_books_owner_idx').on(t.userId), uniqueIndex('user_books_one_title_per_user').on(t.userId, t.bookId)]);
export const cookingSessions = pgTable('cooking_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => authUsers.id, { onDelete: 'cascade' }),
  recipeId: uuid('recipe_id').notNull().references(() => recipes.id, { onDelete: 'cascade' }),
  cookedOn: date('cooked_on').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [index('cooking_sessions_owner_recipe_date_idx').on(t.userId, t.recipeId, t.cookedOn)]);
