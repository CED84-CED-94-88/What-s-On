import { addDays } from '../lib/dates';
import { finalizeSchedule } from '../lib/schedule';
import { fuzzyScore } from '../lib/smartSearch';
import type { BrowseQuery, BrowseResult, DataSource, Episode, Region, SavedShow, Show, ShowSchedule } from '../types';
import { DEMO_GENRES, DEMO_PROVIDERS, DEMO_SHOWS, demoProviders, type DemoShow } from './demoCatalog';

const PAGE_SIZE = 20;

const EPISODE_TITLES = [
  'Pilot', 'New Beginnings', 'The Long Way Round', 'Crossroads', 'Old Friends', 'Undercurrent', 'The Offer',
  'Fault Lines', 'Homecoming', 'Point of No Return', 'Aftermath', 'Borrowed Time', 'Loose Ends', 'The Reckoning',
  'Open Water', 'Tipping Point', 'Hard Reset', 'Echoes', 'Firelight', 'Endgame',
];

function toShow(d: DemoShow, region: Region): Show {
  return {
    id: d.id,
    name: d.name,
    overview: d.overview,
    genreIds: d.genres,
    firstAirDate: `${d.firstAired}-01-01`,
    rating: d.rating,
    providers: demoProviders(d, region),
  };
}

export class DemoSource implements DataSource {
  readonly kind = 'demo' as const;

  async getGenres() {
    return [...DEMO_GENRES].sort((a, b) => a.name.localeCompare(b.name));
  }

  async getProviders(region: Region) {
    return DEMO_PROVIDERS[region];
  }

  async browse(q: BrowseQuery): Promise<BrowseResult> {
    let list = DEMO_SHOWS.filter((d) => d[q.region].length > 0).map((d) => toShow(d, q.region));
    if (q.providerIds.length) list = list.filter((s) => s.providers!.some((p) => q.providerIds.includes(p.id)));
    if (q.genreIds.length) list = list.filter((s) => s.genreIds.some((g) => q.genreIds.includes(g)));
    if (q.text) {
      list = list
        .map((s) => ({ s, score: Math.max(fuzzyScore(q.text, s.name), fuzzyScore(q.text, s.overview) * 0.5) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.s);
    } else {
      // Shows matching more of the chosen genres ("crime dramas") rank first, then by rating.
      const genreHits = (s: Show) => s.genreIds.filter((g) => q.genreIds.includes(g)).length;
      list.sort((a, b) => genreHits(b) - genreHits(a) || (b.rating ?? 0) - (a.rating ?? 0));
    }
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    return { shows: list.slice((q.page - 1) * PAGE_SIZE, q.page * PAGE_SIZE), page: q.page, totalPages };
  }

  async getSchedule(show: SavedShow, today: string): Promise<ShowSchedule> {
    const d = DEMO_SHOWS.find((s) => s.id === show.id);
    if (!d) return { showId: show.id, showName: show.name, upcoming: [], newSeasons: [] };
    const base = { showId: d.id, showName: d.name, status: d.schedule.kind === 'ended' ? 'Ended' : 'Returning Series' };
    const s = d.schedule;
    const ep = (season: number, n: number, airDate: string): Episode => ({
      showId: d.id,
      showName: d.name,
      seasonNumber: season,
      episodeNumber: n,
      name: n === 1 && season === 1 ? 'Pilot' : EPISODE_TITLES[(d.id + n) % EPISODE_TITLES.length],
      airDate,
    });

    const episodes: Episode[] = [];
    if (s.kind === 'airing' || s.kind === 'premiere') {
      const start = s.kind === 'airing' ? addDays(today, -s.startedDaysAgo) : addDays(today, s.inDays);
      const every = s.every ?? 7;
      for (let n = 1; n <= s.episodes; n++) episodes.push(ep(s.season, n, addDays(start, (n - 1) * every)));
    }
    const announced =
      s.kind === 'announced' ? [{ showId: d.id, showName: d.name, seasonNumber: s.season }] : [];
    return finalizeSchedule(base, episodes, announced, today);
  }
}
