import type { RecipeSummary } from '@sousbot/shared';
import { friendlyDate } from '../lib/dates';

export function RecipeCard({ recipe, onOpen }: { recipe: RecipeSummary; onOpen: () => void }) {
  const label = recipe.cookbook ? 'FROM THE COOKBOOK' : 'FROM THE RECIPE COLLECTION';
  return (
    <button className="recipe-card" onClick={onOpen} type="button" aria-label={'Open ' + recipe.title}>
      <span className="recipe-card-art" aria-hidden="true">
        <span className="recipe-art-leaf">❧</span>
        <span className="recipe-art-circle" />
      </span>
      <span className="recipe-card-body">
        <span className="recipe-card-tag">{label}</span>
        <strong>{recipe.title}</strong>
        {recipe.authors.length > 0 && <span className="recipe-card-byline">By {recipe.authors.join(', ')}</span>}
        {recipe.cookbook && (
          <span className="recipe-bookline">
            {recipe.cookbook}
            {recipe.page ? ' · p. ' + recipe.page : ''}
          </span>
        )}
        {recipe.cooking && recipe.cooking.count > 0 && (
          <span className="cooking-preview">
            <b>Cooked {recipe.cooking.count} {recipe.cooking.count === 1 ? 'time' : 'times'}</b>
            {recipe.cooking.lastCookedOn && <span> · Last: {friendlyDate(recipe.cooking.lastCookedOn)}</span>}
            {recipe.cooking.latestNote && <em>“{recipe.cooking.latestNote}”</em>}
          </span>
        )}
        <span className="recipe-card-action">
          View recipe <span aria-hidden="true">→</span>
        </span>
      </span>
    </button>
  );
}
