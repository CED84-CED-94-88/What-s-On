import { afterEach, describe, expect, it, vi } from 'vitest';
import { TmdbSource } from './tmdb';

type Route = [RegExp, unknown];

function mockFetch(routes: Route[]) {
  const calls: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    calls.push(url);
    const path = new URL(url).pathname.replace('/3', '');
    const hit = routes.find(([re]) => re.test(path));
    if (!hit) return new Response('{}', { status: 404 });
    return new Response(JSON.stringify(hit[1]), { status: 200 });
  });
  return calls;
}

afterEach(() => vi.unstubAllGlobals());

const providersFor = (region: string, ids: number[]) => ({
  results: { [region]: { flatrate: ids.map((id) => ({ provider_id: id, provider_name: `P${id}`, logo_path: '/l.png' })) } },
});

describe('TmdbSource', () => {
  it('discovers with region + OR-ed provider/genre filters and attaches providers', async () => {
    const calls = mockFetch([
      [/^\/discover\/tv$/, { page: 1, total_pages: 3, results: [{ id: 1, name: 'A', overview: '', poster_path: '/a.jpg', genre_ids: [18] }] }],
      [/^\/tv\/1\/watch\/providers$/, providersFor('CA', [8, 230])],
    ]);
    const r = await new TmdbSource('key').browse({ region: 'CA', providerIds: [8, 230], genreIds: [18, 35], text: '', page: 1 });
    const discover = new URL(calls.find((c) => c.includes('/discover/tv'))!);
    expect(discover.searchParams.get('watch_region')).toBe('CA');
    expect(discover.searchParams.get('with_watch_providers')).toBe('8|230');
    expect(discover.searchParams.get('with_genres')).toBe('18|35');
    expect(discover.searchParams.get('api_key')).toBe('key');
    expect(r.shows[0].providers!.map((p) => p.id)).toEqual([8, 230]);
    expect(r.shows[0].posterUrl).toBe('https://image.tmdb.org/t/p/w342/a.jpg');
  });

  it('text search filters out shows not streaming in the region', async () => {
    mockFetch([
      [/^\/search\/tv$/, { page: 1, total_pages: 1, results: [
        { id: 1, name: 'Here', overview: '', poster_path: null, genre_ids: [18] },
        { id: 2, name: 'Elsewhere', overview: '', poster_path: null, genre_ids: [18] },
      ] }],
      [/^\/tv\/1\/watch\/providers$/, providersFor('US', [15])],
      [/^\/tv\/2\/watch\/providers$/, providersFor('CA', [230])],
    ]);
    const r = await new TmdbSource('key').browse({ region: 'US', providerIds: [], genreIds: [], text: 'here', page: 1 });
    expect(r.shows.map((s) => s.name)).toEqual(['Here']);
  });

  it('builds a schedule from the current season and a dated new season', async () => {
    mockFetch([
      [/^\/tv\/5$/, {
        id: 5, name: 'Show', overview: '', poster_path: null, status: 'Returning Series',
        last_episode_to_air: { season_number: 2, episode_number: 4, air_date: '2026-09-25', name: '' },
        next_episode_to_air: { season_number: 2, episode_number: 5, air_date: '2026-10-02', name: 'Five' },
        seasons: [
          { season_number: 0, air_date: null, episode_count: 3, name: 'Specials' },
          { season_number: 1, air_date: '2025-01-01', episode_count: 8, name: 'S1' },
          { season_number: 2, air_date: '2026-09-04', episode_count: 6, name: 'S2' },
          { season_number: 3, air_date: '2027-02-01', episode_count: 0, name: 'S3' },
        ],
      }],
      [/^\/tv\/5\/season\/2$/, { episodes: [4, 5, 6].map((n) => ({ season_number: 2, episode_number: n, air_date: `2026-${n === 4 ? '09-25' : n === 5 ? '10-02' : '10-09'}`, name: `E${n}` })) }],
      [/^\/tv\/5\/season\/3$/, { episodes: [] }],
    ]);
    const s = await new TmdbSource('eyJbearer').getSchedule({ id: 5, name: 'Show' }, '2026-09-30');
    expect(s.upcoming.map((e) => e.episodeNumber)).toEqual([5, 6]);
    expect(s.newSeasons).toEqual([expect.objectContaining({ seasonNumber: 3, airDate: '2027-02-01' })]);
  });

  it('reports nothing upcoming for an ended show', async () => {
    mockFetch([
      [/^\/tv\/7$/, {
        id: 7, name: 'Done', overview: '', poster_path: null, status: 'Ended',
        last_episode_to_air: { season_number: 1, episode_number: 8, air_date: '2024-01-01', name: '' },
        next_episode_to_air: null,
        seasons: [{ season_number: 1, air_date: '2023-11-01', episode_count: 8, name: 'S1' }],
      }],
    ]);
    const s = await new TmdbSource('key').getSchedule({ id: 7, name: 'Done' }, '2026-09-30');
    expect(s.upcoming).toEqual([]);
    expect(s.newSeasons).toEqual([]);
  });
});
