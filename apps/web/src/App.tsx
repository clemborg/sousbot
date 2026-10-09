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
  const label = recipe.cookbook ? 'FROM THE COOKBOOK' : 'FROM THE RECIPE COLLECTION';
  return (
    <button className="recipe-card" onClick={onOpen} type="button" aria-label={'Open ' + recipe.title}>
      <span className="recipe-card-art" aria-hidden="true"><span className="recipe-art-leaf">❧</span><span className="recipe-art-circle" /></span>
      <span className="recipe-card-body">
        <span className="recipe-card-tag">{label}</span>
        <strong>{recipe.title}</strong>
        {recipe.authors.length > 0 && <span className="recipe-card-byline">By {recipe.authors.join(', ')}</span>}
        {recipe.cookbook && <span className="recipe-bookline">{recipe.cookbook}{recipe.page ? ' · p. ' + recipe.page : ''}</span>}
        {recipe.cooking && recipe.cooking.count > 0 && (
          <span className="cooking-preview">
            <b>Cooked {recipe.cooking.count} {recipe.cooking.count === 1 ? 'time' : 'times'}</b>
            {recipe.cooking.lastCookedOn && <span> · Last: {friendlyDate(recipe.cooking.lastCookedOn)}</span>}
            {recipe.cooking.latestNote && <em>“{recipe.cooking.latestNote}”</em>}
          </span>
        )}
        <span className="recipe-card-action">View recipe <span aria-hidden="true">→</span></span>
      </span>
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
  const [recipeError, setRecipeError] = useState('');
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<RecipeDetail | null>(null);
  const [history, setHistory] = useState<CookingSession[]>([]);
  const [cookedOn, setCookedOn] = useState(localToday());
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState('');
  const [editingNotes, setEditingNotes] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [authOpen, setAuthOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [owned, setOwned] = useState<OwnedBook[]>([]);
  const [bookFilter, setBookFilter] = useState<'all' | 'mine'>('all');
  const [bookSearch, setBookSearch] = useState('');
  const [booksLoading, setBooksLoading] = useState(false);
  const [booksError, setBooksError] = useState('');
  const [bookBusyId, setBookBusyId] = useState<string | null>(null);
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
    setRecipeError('');
    void api<{ items: RecipeSummary[] }>('/recipes?q=' + encodeURIComponent(query))
      .then(x => { if (live) setRecipes(x.items); })
      .catch((e: unknown) => { if (live) { setRecipes([]); setRecipeError(e instanceof Error ? e.message : 'Search failed'); } })
      .finally(() => { if (live) setRecipeLoading(false); });
    return () => { live = false; };
  }, [query, session?.access_token]);

  async function loadHistory(slug: string) {
    if (!session) { setHistory([]); return; }
    setHistoryLoading(true);
    try {
      const result = await api<{ items: CookingSession[] }>('/recipes/' + encodeURIComponent(slug) + '/cooking-sessions');
      setHistory(result.items);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load cooking history'); }
    finally { setHistoryLoading(false); }
  }
  useEffect(() => {
    if (!detailSlug) { setDetail(null); return; }
    setDetail(null);
    setHistory([]);
    setEditingId(null);
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
    let live = true;
    setBooksLoading(true);
    setBooksError('');
    void Promise.all([
      api<{ items: Book[] }>('/books'),
      session ? api<{ items: OwnedBook[] }>('/me/books') : Promise.resolve({ items: [] as OwnedBook[] }),
    ]).then(([catalog, shelf]) => {
      if (!live) return;
      setBooks(catalog.items);
      setOwned(shelf.items);
    }).catch((e: unknown) => {
      if (live) setBooksError(e instanceof Error ? e.message : 'Could not load cookbooks');
    }).finally(() => { if (live) setBooksLoading(false); });
    return () => { live = false; };
  }, [view, session?.access_token]);


  function search(term: string) {
    setTyped(term);
    setQuery(term.trim());
    setDetailSlug(null);
    setView('discover');
    setHasSearched(true);
    window.setTimeout(() => document.getElementById('recipe-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
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
  function beginEdit(entry: CookingSession) {
    setEditingId(entry.id);
    setEditingDate(entry.cookedOn);
    setEditingNotes(entry.notes ?? '');
  }
  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingId || !detailSlug || !session) return;
    setSaving(true);
    setError('');
    try {
      await api('/me/cooking-sessions/' + encodeURIComponent(editingId), {
        method: 'PATCH', body: JSON.stringify({ cookedOn: editingDate, notes: editingNotes.trim() || null }),
      });
      setEditingId(null);
      await loadHistory(detailSlug);
      const result = await api<{ items: RecipeSummary[] }>('/recipes?q=' + encodeURIComponent(query));
      setRecipes(result.items);
      setNotice('Cooking note updated.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update your note'); }
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
    setBookBusyId(bookId);
    try {
      await api('/me/books', { method: 'POST', body: JSON.stringify({ bookId }) });
      setOwned((await api<{ items: OwnedBook[] }>('/me/books')).items);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to add book'); }
    finally { setBookBusyId(null); }
  }
  async function removeBook(userBookId: string) {
    setBookBusyId(userBookId);
    try {
      await api('/me/books/' + encodeURIComponent(userBookId), { method: 'DELETE' });
      setOwned((await api<{ items: OwnedBook[] }>('/me/books')).items);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to remove book'); }
    finally { setBookBusyId(null); }
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
            <section id="recipe-results" className={"results" + (!hasSearched ? " results-home" : "")}>
              <div className="section-top"><div><p className="eyebrow">DISCOVER SOMETHING DELICIOUS</p>
                <h2>{query ? 'Recipes with “' + query + '”' : 'Explore the collection'}</h2></div>
                <span className="result-count">{recipeLoading ? "Searching…" : recipes.length + " shown"}</span></div>
              {recipeLoading ? <p className="empty" role="status">Finding recipes…</p>
                : recipeError ? <div className="empty" role="alert"><h3>Could not load recipes.</h3><p>{recipeError}</p><button type="button" onClick={() => search(query)}>Try again</button></div>
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
                <p className="eyebrow">FROM THE RECIPE COLLECTION</p>
                <h1>{detail.title}</h1>
                <p className="detail-byline">{detail.authors.length ? 'By ' + detail.authors.join(', ') : 'Author not yet verified'}</p>
                {!!detail.books.length && <div className="book-references">{detail.books.map((b, i) =>
                  <span key={i}>📖 {b.title}{b.verified && b.page ? ' · p. ' + b.page : ''}</span>)}</div>}
                <div className="detail-intro"><p>Something worth making, and remembering.</p></div>
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
                  <aside className="history-panel" aria-label="Your private cooking journal">
                    <p className="eyebrow">YOUR KITCHEN JOURNAL</p>
                    <h2>A little note for next time.</h2>
                    <p className="journal-intro">Remember the changes, the company, or the little things that made this recipe yours.</p>
                    {session ? <>
                      <form onSubmit={e => void logCook(e)} className="cook-form">
                        <h3>Made this recipe?</h3>
                        <label>When did you cook it?<input type="date" required value={cookedOn} onChange={e => setCookedOn(e.target.value)} /></label>
                        <label>Your notes <span className="optional">(optional)</span>
                          <textarea rows={4} maxLength={4000} value={notes} onChange={e => setNotes(e.target.value)} placeholder="What worked? What would you do differently?" /></label>
                        <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : '+ Add to my cooking journal'}</button>
                      </form>
                      <div className="journal-divider" />
                      <h3 className="journal-history-heading">Your past cooks <span className="history-count">{historyLoading ? '…' : history.length}</span></h3>
                      {historyLoading && <p className="muted" role="status">Loading your notes…</p>}
                      {!historyLoading && history.length === 0 && <p className="muted">Your first entry will appear here. Every time you cook this recipe, you can add another.</p>}
                      {!historyLoading && <div className="journal-timeline">{history.map(x => <article className="history-entry" key={x.id}>
                        {editingId === x.id ? <form className="journal-edit-form" onSubmit={e => void saveEdit(e)}>
                          <label>Cooking date<input type="date" required value={editingDate} onChange={e => setEditingDate(e.target.value)} /></label>
                          <label>Notes<textarea rows={4} maxLength={4000} value={editingNotes} onChange={e => setEditingNotes(e.target.value)} /></label>
                          <div className="journal-actions"><button className="primary" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save changes'}</button><button className="secondary" type="button" onClick={() => setEditingId(null)}>Cancel</button></div>
                        </form> : <>
                          <div className="journal-entry-header"><time dateTime={x.cookedOn}>{friendlyDate(x.cookedOn)}</time><span className="journal-entry-mark" aria-hidden="true">✦</span></div>
                          {x.notes ? <p className="journal-entry-notes">{x.notes}</p> : <p className="journal-entry-notes journal-empty-note">No notes added for this occasion.</p>}
                          <div className="journal-entry-actions"><button onClick={() => beginEdit(x)} type="button" aria-label={'Edit entry from ' + x.cookedOn}>Edit note</button><button onClick={() => void deleteCook(x.id)} type="button" aria-label={'Delete entry from ' + x.cookedOn}>Delete</button></div>
                        </>}
                      </article>)}</div>}
                    </> : <div className="journal-signin"><p>Sign in to keep your own private, dated notes for every recipe you make.</p>
                      <button className="primary" type="button" onClick={() => setAuthOpen(true)}>Sign in to start your journal</button></div>}
                  </aside>
                </div>
              </>
            )}
          </section>
        )}

        {view === 'books' && (
          <section className="results books-page">
            <div className="books-intro">
              <div>
                <p className="eyebrow">A LIBRARY OF GOOD THINGS</p>
                <h1>Your cookbook shelf<span className="brand-dot">.</span></h1>
                <p className="muted">A home for the cookbooks you love. Build your own shelf, and browse the full collection for new inspiration.</p>
              </div>
              <div className="books-intro-art" aria-hidden="true"><span>❧</span><span>✳</span></div>
            </div>
            {!session && <div className="shelf-signin"><span>Keep track of your collection across devices.</span><button type="button" onClick={() => setAuthOpen(true)}>Sign in to save books →</button></div>}
            <div className="shelf-toolbar">
              <div className="shelf-tabs" role="group" aria-label="Choose cookbook collection">
                <button type="button" aria-pressed={bookFilter === 'all'} className={bookFilter === 'all' ? 'selected' : ''} onClick={() => setBookFilter('all')}>All cookbooks <span>{books.length}</span></button>
                <button type="button" aria-pressed={bookFilter === 'mine'} className={bookFilter === 'mine' ? 'selected' : ''} onClick={() => setBookFilter('mine')}>My shelf <span>{owned.length}</span></button>
              </div>
              <label className="shelf-search"><span className="sr-only">Search cookbooks by title</span><span aria-hidden="true">⌕</span><input type="search" placeholder="Find a cookbook…" value={bookSearch} onChange={e => setBookSearch(e.target.value)} /></label>
            </div>
            {booksLoading ? <div className="empty" role="status">Opening the cookbook library…</div>
              : booksError ? <div className="empty" role="alert"><h3>We couldn't open the library.</h3><p>{booksError}</p><button type="button" onClick={() => { setView('discover'); window.setTimeout(() => setView('books'), 0); }}>Try again</button></div>
              : (() => {
                const visible = books.filter(book => (bookFilter === 'all' || owned.some(x => x.bookId === book.id))
                  && book.title.toLocaleLowerCase().includes(bookSearch.trim().toLocaleLowerCase()));
                return visible.length === 0 ? <div className="empty shelf-empty">
                  <h3>{bookSearch.trim() ? 'No matching cookbooks.' : bookFilter === 'mine' ? 'Your shelf is waiting.' : 'The library is still growing.'}</h3>
                  <p>{bookSearch.trim() ? 'Try another title or clear your search.' : bookFilter === 'mine' ? 'Browse the full library and add a few favorites to get started.' : 'Cookbooks will appear as verified records are added to the catalog.'}</p>
                  {bookSearch.trim() ? <button type="button" onClick={() => setBookSearch('')}>Clear search</button>
                    : bookFilter === 'mine' ? <button type="button" onClick={() => setBookFilter('all')}>Browse all cookbooks</button> : null}
                </div> : <div className="book-grid">{visible.map((book, index) => {
                  const membership = owned.find(x => x.bookId === book.id);
                  const busy = bookBusyId === book.id || bookBusyId === membership?.id;
                  return <article className="book-card" key={book.id}>
                    <div className={'cover-placeholder cover-style-' + (index % 4)} aria-hidden="true">
                      <span className="cover-ornament">❧</span>
                      <span className="cover-title">{book.title}</span>
                      <span className="cover-imprint">SOUSBOT LIBRARY</span>
                    </div>
                    <h3>{book.title}</h3>
                    {membership
                      ? <button type="button" disabled={busy} onClick={() => void removeBook(membership.id)} className="secondary on-shelf">{busy ? 'Updating…' : '✓ On your shelf · Remove'}</button>
                      : <button type="button" disabled={busy} onClick={() => void addBook(book.id)} className="secondary">{busy ? 'Adding…' : '+ Add to my shelf'}</button>}
                  </article>;
                })}</div>;
              })()}
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
