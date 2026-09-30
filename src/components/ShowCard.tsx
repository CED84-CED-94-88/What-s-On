import type { Genre, Show } from '../types';
import { Poster } from './Poster';

interface Props {
  show: Show;
  genres: Map<number, Genre>;
  selected: boolean;
  onToggle(): void;
}

export function ShowCard({ show, genres, selected, onToggle }: Props) {
  const year = show.firstAirDate?.slice(0, 4);
  const genreNames = show.genreIds.map((id) => genres.get(id)?.name).filter(Boolean).slice(0, 3);
  return (
    <article className={`card ${selected ? 'is-selected' : ''}`}>
      <button
        type="button"
        className="card-poster"
        onClick={onToggle}
        aria-pressed={selected}
        aria-label={`${selected ? 'Remove' : 'Add'} ${show.name} ${selected ? 'from' : 'to'} my shows`}
      >
        <Poster name={show.name} url={show.posterUrl} />
        <span className="card-check" aria-hidden>
          {selected ? '✓' : '+'}
        </span>
      </button>
      <div className="card-body">
        <h3 className="card-title" title={show.name}>
          {show.name}
        </h3>
        <div className="card-meta">
          {year && <span>{year}</span>}
          {show.rating ? <span>★ {show.rating.toFixed(1)}</span> : null}
        </div>
        {genreNames.length > 0 && <div className="card-genres">{genreNames.join(' · ')}</div>}
        {show.providers && show.providers.length > 0 && (
          <ul className="card-providers" aria-label="Streaming on">
            {show.providers.slice(0, 4).map((p) => (
              <li key={p.id} title={p.name}>
                {p.logoUrl ? <img src={p.logoUrl} alt={p.name} /> : <span className="provider-pill">{p.name}</span>}
              </li>
            ))}
          </ul>
        )}
        <p className="card-overview">{show.overview}</p>
        <button type="button" className={`btn ${selected ? 'btn-secondary' : 'btn-primary'} card-btn`} onClick={onToggle}>
          {selected ? 'Added ✓' : 'Add to my shows'}
        </button>
      </div>
    </article>
  );
}
