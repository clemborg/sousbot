import { useEffect, useState, type FormEvent } from 'react';
import { createClient, type Session } from '@supabase/supabase-js';
import type { CookingSession, RecipeDetail, RecipeSummary } from '@sousbot/shared';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const supabase = supabaseUrl && supabaseKey && !supabaseKey.startsWith('replace_')
  ? createClient(supabaseUrl, supabaseKey)
  : null;
const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
type Book = { id: string; title: string; slug: string };
type OwnedBook = { id: string; bookId: string; title: string };
const suggestions = ['Brussels sprouts', 'Miso', 'Chicken', 'Mushrooms', 'Pasta'];

function localToday() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('-');
}
function friendlyDate(d: string) {
  const [year, month, day] = d.split('-').map(Number);
  if (!year || !month || !day) return d;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set('Content-Type', 'application/json');
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (session?.access_token) headers.set('Authorization', 'Bearer ' + session.access_token);
  const res = await fetch(apiBase + '/api/v1' + path, { ...init, headers });
  if (!res.ok) {
    const body: { error?: string } = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'Request failed (' + res.status + ')');
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function RecipeCard({ recipe, onOpen }: { recipe: RecipeSummary; onOpen: () => void }) {
  return (
    <button className="recipe-card" onClick={onOpen} type="button">
      <span className="recipe-card-tag">{recipe.cookbook ? 'FROM A COOKBOOK' : 'RECIPE'}</span>
      <strong>{recipe.title}</strong>
      <span className="recipe-card-byline">{recipe.authors.join(', ') || 'Author unverified'}</span>
      {recipe.cookbook && <span className="recipe-bookline">📖 {recipe.cookbook}{recipe.page ? ' · p. ' + recipe.page : ''}</span>}
      {recipe.cooking && recipe.cooking.count > 0 && (
        <span className="cooking-preview">
          <b>Cooked {recipe.cooking.count} {recipe.cooking.count === 1 ? 'time' : 'times'}</b>
          {recipe.cooking.lastCookedOn && <span> · Last: {friendlyDate(recipe.cooking.lastCookedOn)}</span>}
          {recipe.cooking.latestNote && <em>“{recipe.cooking.latestNote}”</em>}
        </span>
      )}
      <span className="recipe-card-action">View recipe →</span>
    </button>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<'discover' | 'books'>('discover');
  const [hasSearched, setHasSearched] = useState(false);
  const [typed, setTyped] = useState('');
  const [query, setQuery] = useState('');
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<RecipeDetail | null>(null);
  const [history, setHistory] = useState<CookingSession[]>([]);
  const [cookedOn, setCookedOn] = useState(localToday());
  const [notes, setNotes] = useState('');
  const [email, setEmail] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [owned, setOwned] = useState<OwnedBook[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getSession().then(x => setSession(x.data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let live = true;
    setRecipeLoading(true);
    setError('');
    void api<{ items: RecipeSummary[] }>('/recipes?q=' + encodeURIComponent(query))
      .then(x => { if (live) setRecipes(x.items); })
      .catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : 'Search failed'); })
      .finally(() => { if (live) setRecipeLoading(false); });
    return () => { live = false; };
  }, [query, session?.access_token]);

  async function loadHistory(slug: string) {
    if (!session) { setHistory([]); return; }
    try {
      const result = await api<{ items: CookingSession[] }>('/recipes/' + encodeURIComponent(slug) + '/cooking-sessions');
      setHistory(result.items);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load cooking history'); }
  }
  useEffect(() => {
    if (!detailSlug) { setDetail(null); return; }
    let live = true;
    setError('');
    void api<RecipeDetail>('/recipes/' + encodeURIComponent(detailSlug))
      .then(x => { if (live) setDetail(x); })
      .catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : 'Recipe not found'); });
    if (session) void loadHistory(detailSlug); else setHistory([]);
    return () => { live = false; };
  }, [detailSlug, session?.access_token]);

  useEffect(() => {
    if (view !== 'books') return;
    void api<{ items: Book[] }>('/books').then(x => setBooks(x.items))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load books'));
    if (session) {
      void api<{ items: OwnedBook[] }>('/me/books').then(x => setOwned(x.items))
        .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load your bookshelf'));
    } else setOwned([]);
  }, [view, session?.access_token]);

  function search(term: string) {
    setTyped(term);
    setQuery(term.trim());
    setDetailSlug(null);
    setView('discover');
    setHasSearched(true);
  }
  async function signIn(e: FormEvent) {
    e.preventDefault();
    if (!supabase) { setError('Supabase keys are not yet configured.'); return; }
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(), options: { emailRedirectTo: window.location.origin },
    });
    if (authError) setError(authError.message);
    else { setNotice('Check your email for a sign-in link.'); setAuthOpen(false); }
  }
  async function logCook(e: FormEvent) {
    e.preventDefault();
    if (!detailSlug || !session) return;
    setSaving(true); setError('');
    try {
      await api('/recipes/' + encodeURIComponent(detailSlug) + '/cooking-sessions', {
        method: 'POST', body: JSON.stringify({ cookedOn, notes: notes.trim() || null }),
      });
      setNotes(''); setCookedOn(localToday()); setNotice('Added to your cooking history.');
      await loadHistory(detailSlug);
      const x = await api<{ items: RecipeSummary[] }>('/recipes?q=' + encodeURIComponent(query));
      setRecipes(x.items);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save'); }
    finally { setSaving(false); }
  }
  async function deleteCook(id: string) {
    if (!detailSlug || !window.confirm('Delete this cooking entry?')) return;
    try {
      await api('/me/cooking-sessions/' + encodeURIComponent(id), { method: 'DELETE' });
      await loadHistory(detailSlug);
      const x = await api<{ items: RecipeSummary[] }>('/recipes?q=' + encodeURIComponent(query));
      setRecipes(x.items);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to delete'); }
  }
  async function addBook(bookId: string) {
    if (!session) { setAuthOpen(true); return; }
    try {
      await api('/me/books', { method: 'POST', body: JSON.stringify({ bookId }) });
      setOwned((await api<{ items: OwnedBook[] }>('/me/books')).items);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to add book'); }
  }
  async function removeBook(userBookId: string) {
    try {
      await api('/me/books/' + encodeURIComponent(userBookId), { method: 'DELETE' });
      setOwned((await api<{ items: OwnedBook[] }>('/me/books')).items);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to remove book'); }
  }

  return (
    <div className="site-shell">
      <header className="topbar">
        <button type="button" className="brand" onClick={() => { setDetailSlug(null); setView('discover'); setHasSearched(false); }} aria-label="Sousbot home">
          <span>Sousbot<span className="brand-dot">.</span></span>
        </button>
        <nav aria-label="Main navigation">
          <button className={view === 'discover' ? 'active' : ''} onClick={() => { setDetailSlug(null); setView('discover'); }}>Recipes</button>
          <button className={view === 'books' ? 'active' : ''} onClick={() => { setDetailSlug(null); setView('books'); }}>Cookbooks</button>
        </nav>
        {session
          ? <button className="account" onClick={() => void supabase?.auth.signOut()} type="button">Sign out</button>
          : <button className="account" onClick={() => setAuthOpen(true)} type="button">Sign in</button>}
      </header>
      <main>
        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss">×</button></div>}
        {error && <div className="error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss">×</button></div>}

        {view === 'discover' && !detailSlug && (
          <>
            <section className="hero">
              <div className="hero-inner">
                <div className="hero-copy">
                  <p className="eyebrow">A LITTLE INSPIRATION FOR THE KITCHEN</p>
                  <h1>Find what<br />to cook<span className="brand-dot">.</span></h1>
                  <p className="hero-subtitle">Search ingredients, explore recipes from the world's cookbooks, and keep track of what you cook.</p>
                  <form className="search-box" onSubmit={e => { e.preventDefault(); search(typed); }}>
                    <label className="sr-only" htmlFor="ingredient-search">Search ingredients or dishes</label>
                    <span className="search-glyph" aria-hidden="true">⌕</span>
                    <input id="ingredient-search" placeholder="What would you like to cook?" value={typed} onChange={e => setTyped(e.target.value)} />
                    <button type="submit">Search →</button>
                  </form>
                  <div className="quick-search"><span>Try an ingredient:</span><div className="ingredient-chips">{suggestions.map(x =>
                    <button type="button" key={x} onClick={() => search(x)}>{x}</button>)}</div></div>
                </div>
                <div className="hero-art" aria-hidden="true"><img src="/illustrations/ingredient-still-life.svg" alt="" /></div>
              </div>
            </section>
            {!hasSearched && <section className="features" aria-label="Sousbot features">
              <div className="feature"><span aria-hidden="true">♧</span><h3>Great cookbooks</h3><p>Recipes from beloved cooks and authors.</p></div>
              <div className="feature"><span aria-hidden="true">⌕</span><h3>Ingredient search</h3><p>Find inspiration from what you feel like cooking.</p></div>
              <div className="feature"><span aria-hidden="true">▤</span><h3>Your cooking history</h3><p>Keep notes and remember what worked.</p></div>
              <div className="feature"><span aria-hidden="true">❧</span><h3>Simple and focused</h3><p>A calm, thoughtful cooking companion.</p></div>
            </section>}
            <section className={"results" + (!hasSearched ? " results-home" : "")}>
              <div className="section-top"><div><p className="eyebrow">DISCOVER SOMETHING DELICIOUS</p>
                <h2>{query ? 'Recipes with “' + query + '”' : 'Explore the collection'}</h2></div>
                <span className="result-count">{recipes.length} shown</span></div>
              {recipeLoading ? <p className="empty">Finding recipes…</p>
                : recipes.length ? <div className="recipe-grid">{recipes.map(x =>
                  <RecipeCard key={x.id} recipe={x} onOpen={() => setDetailSlug(x.slug)} />)}</div>
                : <div className="empty">
                  <h3>{query ? 'Nothing matching this ingredient yet.' : 'Your collection starts here.'}</h3>
                  <p>{query ? 'Try another ingredient or clear the search.' : 'The catalog is currently empty. Recipes appear once they are imported, reviewed and published.'}</p>
                  {query && <button onClick={() => search('')}>Show all recipes</button>}
                </div>}
            </section>
          </>
        )}

        {view === 'discover' && detailSlug && (
          <section className="detail">
            <button className="back-link" onClick={() => { setDetailSlug(null); setHistory([]); }}>← Back to results</button>
            {!detail ? <p className="empty">Opening recipe…</p> : (
              <>
                <p className="eyebrow">COOK SOMETHING GOOD</p>
                <h1>{detail.title}</h1>
                <p className="detail-byline">By {detail.authors.join(', ') || 'Unknown author'}</p>
                {!!detail.books.length && <div className="book-references">{detail.books.map((b, i) =>
                  <span key={i}>📖 {b.title}{b.verified && b.page ? ' · p. ' + b.page : ' · Page unverified'}</span>)}</div>}
                <div className="detail-columns">
                  <div className="recipe-body">
                    {detail.servings && <p className="servings">Serves {detail.servings}</p>}
                    <h2>Ingredients</h2>
                    <ul className="ingredients">{detail.ingredients.map((i, n) => <li key={n}>{i}</li>)}</ul>
                    <h2>Method</h2>
                    {detail.method?.length
                      ? <ol className="method">{detail.method.map((step, n) => <li key={n}>{step}</li>)}</ol>
                      : <p className="muted">Full directions aren't available for display here. Refer to the linked published source or your cookbook.</p>}
                    {!!detail.sources.length && <div className="sources"><h3>Published sources</h3>
                      {detail.sources.map((s, i) => <a key={i} href={s.url} target="_blank" rel="noreferrer">Read source ↗</a>)}</div>}
                  </div>
                  <aside className="history-panel">
                    <p className="eyebrow">YOUR KITCHEN JOURNAL</p>
                    <h2>Made this before?</h2>
                    {session ? <>
                      <form onSubmit={e => void logCook(e)} className="cook-form">
                        <label>When did you cook it?<input type="date" required value={cookedOn} onChange={e => setCookedOn(e.target.value)} /></label>
                        <label>Notes <span className="optional">(optional)</span>
                          <textarea rows={4} maxLength={4000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What worked? Anything to change next time?" /></label>
                        <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : '+ Log this cook'}</button>
                      </form>
                      <h3>Cooking history <span className="history-count">{history.length}</span></h3>
                      {history.length === 0 && <p className="muted">Your first cooking note will appear here.</p>}
                      {history.map(x => <article className="history-entry" key={x.id}>
                        <div><b>{friendlyDate(x.cookedOn)}</b><button onClick={() => void deleteCook(x.id)} type="button" aria-label={'Delete entry from ' + x.cookedOn}>Delete</button></div>
                        {x.notes && <p>{x.notes}</p>}
                      </article>)}
                    </> : <><p className="muted">Sign in to save dated cooking notes and see what you've made before.</p>
                      <button className="primary" type="button" onClick={() => setAuthOpen(true)}>Sign in to log a cook</button></>}
                  </aside>
                </div>
              </>
            )}
          </section>
        )}

        {view === 'books' && (
          <section className="results books-page">
            <p className="eyebrow">YOUR PERSONAL SHELF</p><h1>My Cookbooks</h1>
            <p className="muted">Keep track of the books you own. The full recipe catalog remains searchable even without a cookbook.</p>
            {!session && <p className="banner">Sign in to add cookbooks to your shelf.</p>}
            {books.length === 0 ? <div className="empty">No cookbooks have been imported into the catalog yet.</div> :
              <div className="book-grid">{books.map(book => {
                const membership = owned.find(x => x.bookId === book.id);
                return <article className="book-card" key={book.id}>
                  <div className="cover-placeholder" aria-hidden="true">SOUSBOT<br />COOKBOOK</div>
                  <h3>{book.title}</h3>
                  {membership
                    ? <button onClick={() => void removeBook(membership.id)} className="secondary">✓ On your shelf · Remove</button>
                    : <button onClick={() => void addBook(book.id)} className="secondary">+ Add to my shelf</button>}
                </article>;
              })}</div>}
          </section>
        )}
      </main>
      {authOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setAuthOpen(false); }}>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
          <button className="close" onClick={() => setAuthOpen(false)} aria-label="Close">×</button>
          <p className="eyebrow">YOUR PERSONAL RECIPE JOURNAL</p>
          <h2 id="auth-title">Welcome to Sousbot</h2>
          <p className="muted">Sign in to keep a record of everything you've cooked.</p>
          <form onSubmit={e => void signIn(e)}>
            <label>Email address<input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <button className="primary" type="submit">Send sign-in link</button>
          </form>
        </div>
      </div>}
      <footer>SOUSBOT <span>· A little help deciding what to cook.</span></footer>
    </div>
  );
}
