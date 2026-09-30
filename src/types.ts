export type Region = 'CA' | 'US';

export const REGIONS: { code: Region; label: string; flag: string }[] = [
  { code: 'CA', label: 'Canada', flag: '🇨🇦' },
  { code: 'US', label: 'United States', flag: '🇺🇸' },
];

export interface Genre {
  id: number;
  name: string;
}

export interface Provider {
  id: number;
  name: string;
  logoUrl?: string;
}

export interface Show {
  id: number;
  name: string;
  overview: string;
  posterUrl?: string;
  firstAirDate?: string;
  genreIds: number[];
  rating?: number;
  /** Streaming services carrying the show in the region it was fetched for. Undefined = not loaded yet. */
  providers?: Provider[];
}

/** Minimal snapshot of a show kept in the user's saved list. */
export interface SavedShow {
  id: number;
  name: string;
  posterUrl?: string;
}

export interface Episode {
  showId: number;
  showName: string;
  posterUrl?: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  overview?: string;
  /** ISO date, YYYY-MM-DD. */
  airDate: string;
}

export interface SeasonAnnouncement {
  showId: number;
  showName: string;
  posterUrl?: string;
  seasonNumber: number;
  /** Premiere date if known. */
  airDate?: string;
}

export interface ShowSchedule {
  showId: number;
  showName: string;
  posterUrl?: string;
  status?: string;
  /** Episodes airing today or later, sorted by date. */
  upcoming: Episode[];
  /** Upcoming seasons (premiere dated in the future, or announced without a date). */
  newSeasons: SeasonAnnouncement[];
}

export interface BrowseQuery {
  region: Region;
  providerIds: number[];
  genreIds: number[];
  text: string;
  page: number;
}

export interface BrowseResult {
  shows: Show[];
  page: number;
  totalPages: number;
}

export interface DataSource {
  readonly kind: 'tmdb' | 'demo';
  getGenres(): Promise<Genre[]>;
  getProviders(region: Region): Promise<Provider[]>;
  browse(query: BrowseQuery): Promise<BrowseResult>;
  getSchedule(show: SavedShow, today: string): Promise<ShowSchedule>;
}
