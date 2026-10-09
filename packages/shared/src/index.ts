import { z } from 'zod';

export const searchSchema = z.object({ q: z.string().trim().max(100).default(''), limit: z.coerce.number().int().min(1).max(50).default(20) });
export const cookingSessionInputSchema = z.object({
  cookedOn: z.iso.date(),
  notes: z.string().max(4000).nullable().optional(),
});
export const cookingSessionPatchSchema = cookingSessionInputSchema.partial().refine(
  x => Object.keys(x).length > 0, 'At least one field is required',
);
export type CookingSessionInput = z.infer<typeof cookingSessionInputSchema>;
export type RecipeSummary = { id: string; slug: string; title: string; authors: string[]; cookbook: string | null; page: number | null; servings: string | null; cooking: { count: number; lastCookedOn: string | null; latestNote: string | null } | null };
export type RecipeDetail = RecipeSummary & { ingredients: string[]; method: string[] | null; sources: { url: string }[]; books: { title: string; page: number | null; verified: boolean }[] };
export type CookingSession = { id: string; cookedOn: string; notes: string | null; createdAt: string; updatedAt: string };
