import { useId, useState } from 'react';
import { filterKey, replaceLastWord, type DetectedFilter, type ParsedQuery } from '../lib/smartSearch';
import type { Show } from '../types';

interface Props {
  query: string;
  onQueryChange(q: string): void;
  parsed: ParsedQuery;
  filterSuggestions: DetectedFilter[];
  titleSuggestions: Show[];
  onDismissFilter(key: string): void;
}

type Item = { type: 'filter'; f: DetectedFilter } | { type: 'title'; show: Show };

export function SmartSearch({ query, onQueryChange, parsed, filterSuggestions, titleSuggestions, onDismissFilter }: Props) {
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();

  const items: Item[] = [
    ...filterSuggestions.map((f) => ({ type: 'filter' as const, f })),
    ...titleSuggestions.slice(0, 5).map((show) => ({ type: 'title' as const, show })),
  ];
  const open = focused && query.trim().length > 0 && items.length > 0;

  const choose = (item: Item) => {
    if (item.type === 'filter') onQueryChange(replaceLastWord(query, item.f.name));
    else onQueryChange(item.show.name);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && open) {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === 'ArrowUp' && open) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === 'Enter' && open && active >= 0) {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === 'Escape') {
      if (open) setFocused(false);
      else onQueryChange('');
    }
  };

  return (
    <div className="smart-search">
      <div className="search-box">
        <span className="search-icon" aria-hidden>
          ⌕
        </span>
        <input
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-label="Search shows"
          placeholder='Try "crime dramas on netflix", "scifi crave" or a title…'
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setActive(-1);
            setFocused(true);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 120)}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button type="button" className="search-clear" aria-label="Clear search" onClick={() => onQueryChange('')}>
            ×
          </button>
        )}
      </div>

      {open && (
        <ul className="suggestions" id={listId} role="listbox">
          {items.map((item, i) => (
            <li
              key={item.type === 'filter' ? filterKey(item.f) : `t${item.show.id}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'active' : ''}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(item);
              }}
              onMouseEnter={() => setActive(i)}
            >
              {item.type === 'filter' ? (
                <>
                  <span className={`tag tag-${item.f.kind}`}>{item.f.kind === 'genre' ? 'Genre' : 'Service'}</span>
                  {item.f.name}
                </>
              ) : (
                <>
                  <span className="tag tag-title">Show</span>
                  {item.show.name}
                  {item.show.firstAirDate && <span className="muted"> ({item.show.firstAirDate.slice(0, 4)})</span>}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {parsed.filters.length > 0 && (
        <div className="understood" aria-live="polite">
          <span className="muted">Searching for</span>
          {parsed.filters.map((f) => (
            <span key={filterKey(f)} className={`chip chip-${f.kind}`}>
              {f.name}
              <button
                type="button"
                aria-label={`Don't treat "${f.phrase}" as a ${f.kind === 'genre' ? 'genre' : 'service'}`}
                title={`Treat "${f.phrase}" as title text instead`}
                onClick={() => onDismissFilter(filterKey(f))}
              >
                ×
              </button>
            </span>
          ))}
          {parsed.text && (
            <span className="chip chip-text">
              title: “{parsed.text}”
            </span>
          )}
        </div>
      )}
    </div>
  );
}
