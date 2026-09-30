import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MultiSelect } from '../components/MultiSelect';
import { ShowCard } from '../components/ShowCard';
import { SmartSearch } from '../components/SmartSearch';
import { useAsync, useDebounced } from '../hooks/useAsync';
import { parseQuery, suggestFilters } from '../lib/smartSearch';
import { useAppState } from '../state/AppState';
import { REGIONS, type Show } from '../types';

export function BrowsePage() {
  const { region, source, isSaved, toggleSaved, saved } = useAppState();
  const [query, setQuery] = useState('');
  const [ignored, setIgnored] = useState<Set<string>>(new Set());
  const [providerIds, setProviderIds] = useState<number[]>([]);
  const [genreIds, setGenreIds] = useState<number[]>([]);

  const genres = useAsync(() => source.getGenres(), [source]);
  const providers = useAsync(() => source.getProviders(region), [source, region]);

  // Services differ by country; drop selections that don't exist in the new region.
  useEffect(() => {
    if (providers.data) setProviderIds((ids) => ids.filter((id) => providers.data!.some((p) => p.id === id)));
  }, [providers.data]);

  const genreList = useMemo(() => genres.data ?? [], [genres.data]);
  const providerList = useMemo(() => providers.data ?? [], [providers.data]);
  const genreMap = useMemo(() => new Map(genreList.map((g) => [g.id, g])), [genreList]);

  const parsed = useMemo(() => parseQuery(query, genreList, providerList, ignored), [query, genreList, providerList, ignored]);
  const filterSuggestions = useMemo(
    () => suggestFilters(query, genreList, providerList, parsed.filters),
    [query, genreList, providerList, parsed.filters],
  );
  const impliedGenres = parsed.filters.filter((f) => f.kind === 'genre').map((f) => f.id);
  const impliedProviders = parsed.filters.filter((f) => f.kind === 'provider').map((f) => f.id);

  const immediate = JSON.stringify({
    text: parsed.text,
    genreIds: [...new Set([...genreIds, ...impliedGenres])].sort(),
    providerIds: [...new Set([...providerIds, ...impliedProviders])].sort(),
  });
  const effective = useDebounced(immediate, 250);

  const [pages, setPages] = useState(1);
  const [shows, setShows] = useState<Show[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  // Reset paging during render (not in an effect) so a stale page number is never fetched for a new query.
  const [queryKey, setQueryKey] = useState({ effective, region, source });
  if (queryKey.effective !== effective || queryKey.region !== region || queryKey.source !== source) {
    setQueryKey({ effective, region, source });
    setPages(1);
  }

  const result = useAsync(async () => {
    const q = JSON.parse(effective) as { text: string; genreIds: number[]; providerIds: number[] };
    return source.browse({ region, page: pages, ...q });
  }, [effective, region, source, pages]);

  useEffect(() => {
    if (!result.data) return;
    const { shows: page, page: n, totalPages: tp } = result.data;
    setTotalPages(tp);
    setShows((prev) => {
      if (n === 1) return page;
      const seen = new Set(prev.map((s) => s.id));
      return [...prev, ...page.filter((s) => !seen.has(s.id))];
    });
  }, [result.data]);

  const onQueryChange = (q: string) => {
    setQuery(q);
    if (!q.trim()) setIgnored(new Set());
  };

  const loading = result.loading || immediate !== effective;
  const regionLabel = REGIONS.find((r) => r.code === region)!.label;
  const hasFilters = providerIds.length > 0 || genreIds.length > 0 || query.length > 0;

  return (
    <div className="page">
      <section className="hero">
        <h1>Find your next show</h1>
        <p className="muted">
          Showing what's streaming in <strong>{regionLabel}</strong>. Pick shows to follow and we'll put new episodes on
          your calendar.
        </p>
      </section>

      <section className="toolbar" aria-label="Search and filters">
        <SmartSearch
          query={query}
          onQueryChange={onQueryChange}
          parsed={parsed}
          filterSuggestions={filterSuggestions}
          titleSuggestions={parsed.text ? shows : []}
          onDismissFilter={(key) => setIgnored((s) => new Set(s).add(key))}
        />
        <div className="filters">
          <MultiSelect
            label="Streaming services"
            options={providerList.map((p) => ({ id: p.id, name: p.name, iconUrl: p.logoUrl }))}
            selected={providerIds}
            implied={impliedProviders}
            onChange={setProviderIds}
          />
          <MultiSelect
            label="Genres"
            options={genreList}
            selected={genreIds}
            implied={impliedGenres}
            onChange={setGenreIds}
          />
          {hasFilters && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setProviderIds([]);
                setGenreIds([]);
                onQueryChange('');
              }}
            >
              Reset
            </button>
          )}
        </div>
        {(providerIds.length > 0 || genreIds.length > 0) && (
          <div className="active-filters">
            {providerIds.map((id) => (
              <span key={`p${id}`} className="chip chip-provider">
                {providerList.find((p) => p.id === id)?.name}
                <button type="button" aria-label="Remove" onClick={() => setProviderIds((x) => x.filter((v) => v !== id))}>
                  ×
                </button>
              </span>
            ))}
            {genreIds.map((id) => (
              <span key={`g${id}`} className="chip chip-genre">
                {genreMap.get(id)?.name}
                <button type="button" aria-label="Remove" onClick={() => setGenreIds((x) => x.filter((v) => v !== id))}>
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {result.error && <div className="notice notice-error">{result.error.message}</div>}

      <div className="results-head">
        <span className="muted">{loading && pages === 1 ? 'Loading…' : `${shows.length} show${shows.length === 1 ? '' : 's'}`}</span>
      </div>

      {!loading && !result.error && shows.length === 0 ? (
        <div className="empty">
          <p>No shows match those filters in {regionLabel}.</p>
          <p className="muted">Try fewer services or genres, or a different spelling.</p>
        </div>
      ) : (
        <div className={`grid ${loading && pages === 1 ? 'is-loading' : ''}`}>
          {shows.map((s) => (
            <ShowCard key={s.id} show={s} genres={genreMap} selected={isSaved(s.id)} onToggle={() => toggleSaved(s)} />
          ))}
        </div>
      )}

      {pages < totalPages && shows.length > 0 && (
        <div className="load-more">
          <button type="button" className="btn btn-secondary" disabled={loading} onClick={() => setPages((p) => p + 1)}>
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {saved.length > 0 && (
        <Link to="/calendar" className="floating-cta">
          📅 View calendar for {saved.length} show{saved.length === 1 ? '' : 's'}
        </Link>
      )}
    </div>
  );
}
