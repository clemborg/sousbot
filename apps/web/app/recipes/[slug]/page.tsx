import { SousbotPage } from '@/components/SousbotPage';

type PageProps = { params: Promise<{ slug: string }> };

export default async function RecipeDetailPage({ params }: PageProps) {
  const { slug } = await params;
  return <SousbotPage recipeSlug={slug} />;
}
