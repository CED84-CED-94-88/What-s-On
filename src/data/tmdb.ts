import { finalizeSchedule } from '../lib/schedule';
import { fuzzyScore } from '../lib/smartSearch';
import type {
  BrowseQuery,
  BrowseResult,
  DataSource,
  Episode,
  Genre,
  Provider,
  Region,
  SavedShow,
  SeasonAnnouncement,
  Show,
  ShowSchedule,
} from '../types';

/**
 * Live data from The Movie Database (https://www.themoviedb.org).
 * Streaming availability per region comes from TMDB's watch-provider data (powered by JustWatch).
 */

const API = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p';

interface TmdbShow {
  id: number;
  name: string;
  overview: string;
  poster_path: string | null;
  first_air_date?: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  vote_average?: number;
}

interface TmdbEpisode {
  air_date: string | null;
  episode_number: number;
  season_number: number;
  name: string;
  overview?: string;
}

interface TmdbDetails extends TmdbShow {
  status: string;
  next_episode_to_air: TmdbEpisode | null;
  last_episode_to_air: TmdbEpisode | null;
  seasons: { season_number: number; air_date: string | null; episode_count: number; name: string }[];
}

interface TmdbProviderEntry {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority?: number;
  display_priorities?: Record<string, number>;
}

/** Only subscription streaming ("flatrate") — not rent/buy storefronts. */
const MONETIZATION = 'flatrate|free|ads';

export class TmdbSource implements DataSource {
  readonly kind = 'tmdb' as const;
  private cache = new Map<string, Promise<unknown>>();

  constructor(private readonly apiKey: string) {}

  private get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
    const url = new URL(API + path);
    const isBearer = this.apiKey.startsWith('eyJ');
    if (!isBearer) url.searchParams.set('api_key', this.apiKey);
    for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    const key = url.toString();
    let p = this.cache.get(key) as Promise<T> | undefined;
    if (!p) {
      p = fetch(key, { headers: isBearer ? { Authorization: `Bearer ${this.apiKey}` } : {} })
        .catch(() => {
          throw new Error("Couldn't reach TMDB. Check your internet connection.");
        })
        .then(async (r) => {
        if (r.status === 401) throw new Error('TMDB rejected the API key. Check it on the Settings page.');
        if (!r.ok) throw new Error(`TMDB request failed (${r.status})`);
        return r.json() as Promise<T>;
      });
      p.catch(() => this.cache.delete(key));
      this.cache.set(key, p);
    }
    return p;
  }

  async getGenres(): Promise<Genre[]> {
    const data = await this.get<{ genres: Genre[] }>('/genre/tv/list', { language: 'en-US' });
    return data.genres.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getProviders(region: Region): Promise<Provider[]> {
    const data = await this.get<{ results: TmdbProviderEntry[] }>('/watch/providers/tv', {
      watch_region: region,
      language: 'en-US',
    });
    return data.results
      .sort((a, b) => priority(a, region) - priority(b, region))
      .slice(0, 40)
      .map(toProvider);
  }

  async validate(): Promise<void> {
    await this.get('/configuration');
  }

  private async providersFor(showId: number, region: Region): Promise<Provider[]> {
    const data = await this.get<{ results: Record<string, { flatrate?: TmdbProviderEntry[]; free?: TmdbProviderEntry[]; ads?: TmdbProviderEntry[] }> }>(
      `/tv/${showId}/watch/providers`,
    );
    const r = data.results[region];
    if (!r) return [];
    const seen = new Set<number>();
    return [...(r.flatrate ?? []), ...(r.free ?? []), ...(r.ads ?? [])]
      .filter((p) => !seen.has(p.provider_id) && seen.add(p.provider_id))
      .map(toProvider);
  }

  private async withProviders(shows: TmdbShow[], region: Region): Promise<Show[]> {
    return Promise.all(
      shows.map(async (s) => ({ ...toShow(s), providers: await this.providersFor(s.id, region).catch(() => []) })),
    );
  }

  async browse(q: BrowseQuery): Promise<BrowseResult> {
    if (!q.text) {
      const data = await this.get<{ results: TmdbShow[]; page: number; total_pages: number }>('/discover/tv', {
        watch_region: q.region,
        with_watch_providers: q.providerIds.join('|') || undefined,
        with_watch_monetization_types: q.providerIds.length ? MONETIZATION : undefined,
        with_genres: q.genreIds.join('|') || undefined,
        sort_by: 'popularity.desc',
        include_adult: 'false',
        language: 'en-US',
        page: q.page,
      });
      let shows = await this.withProviders(data.results, q.region);
      // Without a service filter, still only list shows streamable in the chosen country.
      if (!q.providerIds.length) shows = shows.filter((s) => s.providers!.length > 0);
      return { shows, page: data.page, totalPages: Math.min(data.total_pages, 500) };
    }

    // TMDB's text search can't filter by provider/genre, so filter the results ourselves.
    const data = await this.get<{ results: TmdbShow[]; page: number; total_pages: number }>('/search/tv', {
      query: q.text,
      include_adult: 'false',
      language: 'en-US',
      page: q.page,
    });
    let results = data.results;
    if (q.genreIds.length) results = results.filter((s) => s.genre_ids?.some((g) => q.genreIds.includes(g)));
    let shows = await this.withProviders(results, q.region);
    shows = shows.filter((s) =>
      q.providerIds.length ? s.providers!.some((p) => q.providerIds.includes(p.id)) : s.providers!.length > 0,
    );
    // Blend TMDB popularity order with how closely the title matches what was typed.
    shows = shows
      .map((s, i) => ({ s, score: fuzzyScore(q.text, s.name) * 2 - i }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.s);
    return { shows, page: data.page, totalPages: Math.min(data.total_pages, 500) };
  }

  async getSchedule(show: SavedShow, today: string): Promise<ShowSchedule> {
    const d = await this.get<TmdbDetails>(`/tv/${show.id}`, { language: 'en-US' });
    const base = { showId: d.id, showName: d.name, posterUrl: poster(d.poster_path), status: d.status };
    const toEp = (e: TmdbEpisode): Episode => ({
      showId: d.id,
      showName: d.name,
      posterUrl: base.posterUrl,
      seasonNumber: e.season_number,
      episodeNumber: e.episode_number,
      name: e.name,
      overview: e.overview,
      airDate: e.air_date!,
    });

    const lastAiredSeason = d.last_episode_to_air?.season_number ?? 0;
    const futureSeasons = d.seasons.filter(
      (s) =>
        s.season_number > 0 &&
        (s.season_number >= (d.next_episode_to_air?.season_number ?? Infinity) ||
          (s.air_date !== null && s.air_date >= today) ||
          s.season_number > lastAiredSeason),
    );

    const episodes: Episode[] = [];
    await Promise.all(
      futureSeasons.map(async (s) => {
        const season = await this.get<{ episodes: TmdbEpisode[] }>(`/tv/${d.id}/season/${s.season_number}`, {
          language: 'en-US',
        }).catch(() => ({ episodes: [] as TmdbEpisode[] }));
        for (const e of season.episodes) if (e.air_date) episodes.push(toEp(e));
      }),
    );
    if (d.next_episode_to_air?.air_date && !episodes.some((e) => e.airDate === d.next_episode_to_air!.air_date)) {
      episodes.push(toEp(d.next_episode_to_air));
    }

    const ended = d.status === 'Ended' || d.status === 'Canceled';
    const announced: SeasonAnnouncement[] = ended
      ? []
      : futureSeasons
          .filter((s) => s.season_number > lastAiredSeason)
          .map((s) => ({
            showId: d.id,
            showName: d.name,
            posterUrl: base.posterUrl,
            seasonNumber: s.season_number,
            airDate: s.air_date ?? undefined,
          }));

    return finalizeSchedule(base, episodes, announced, today);
  }
}

function priority(p: TmdbProviderEntry, region: Region): number {
  return p.display_priorities?.[region] ?? p.display_priority ?? 999;
}

function toProvider(p: TmdbProviderEntry): Provider {
  return { id: p.provider_id, name: p.provider_name, logoUrl: p.logo_path ? `${IMG}/w92${p.logo_path}` : undefined };
}

function poster(path: string | null): string | undefined {
  return path ? `${IMG}/w342${path}` : undefined;
}

function toShow(s: TmdbShow): Show {
  return {
    id: s.id,
    name: s.name,
    overview: s.overview,
    posterUrl: poster(s.poster_path),
    firstAirDate: s.first_air_date || undefined,
    genreIds: s.genre_ids ?? s.genres?.map((g) => g.id) ?? [],
    rating: s.vote_average,
  };
}
