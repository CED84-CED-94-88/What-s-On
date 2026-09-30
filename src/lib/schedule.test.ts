import { describe, expect, it } from 'vitest';
import { DemoSource } from '../data/demo';
import { DEMO_SHOWS } from '../data/demoCatalog';
import { monthGrid } from './dates';
import { finalizeSchedule, groupByDay, isFullyReleased } from './schedule';
import type { Episode } from '../types';

const today = '2026-09-30';
const ep = (season: number, n: number, airDate: string): Episode => ({
  showId: 1, showName: 'X', seasonNumber: season, episodeNumber: n, name: `E${n}`, airDate,
});

describe('finalizeSchedule', () => {
  it('drops past episodes and flags season premieres', () => {
    const s = finalizeSchedule(
      { showId: 1, showName: 'X' },
      [ep(2, 9, '2026-09-01'), ep(2, 10, '2026-10-07'), ep(3, 1, '2027-01-05'), ep(3, 2, '2027-01-12')],
      [],
      today,
    );
    expect(s.upcoming.map((e) => `${e.seasonNumber}.${e.episodeNumber}`)).toEqual(['2.10', '3.1', '3.2']);
    expect(s.newSeasons).toEqual([expect.objectContaining({ seasonNumber: 3, airDate: '2027-01-05' })]);
  });

  it('keeps announced seasons without dates but not seasons already underway', () => {
    const s = finalizeSchedule(
      { showId: 1, showName: 'X' },
      [ep(4, 3, '2026-10-02')],
      [{ showId: 1, showName: 'X', seasonNumber: 4 }, { showId: 1, showName: 'X', seasonNumber: 5 }],
      today,
    );
    expect(s.newSeasons.map((n) => n.seasonNumber)).toEqual([5]);
  });

  it('treats a show with nothing upcoming as fully released', () => {
    expect(isFullyReleased(finalizeSchedule({ showId: 1, showName: 'X' }, [ep(1, 1, '2020-01-01')], [], today))).toBe(true);
  });
});

describe('groupByDay', () => {
  it('collapses binge drops into one item', () => {
    const s = finalizeSchedule({ showId: 1, showName: 'X' }, [1, 2, 3].map((n) => ep(2, n, '2026-10-10')), [], today);
    const items = groupByDay([s]).get('2026-10-10')!;
    expect(items).toHaveLength(1);
    expect(items[0].episodes).toHaveLength(3);
    expect(items[0].premiere).toBe(true);
  });
});

describe('monthGrid', () => {
  it('starts on Sunday and covers the month', () => {
    const g = monthGrid(2026, 8); // September 2026 starts on a Tuesday
    expect(g[0][0]).toBe('2026-08-30');
    expect(g.flat()).toContain('2026-09-30');
    expect(g.every((w) => w.length === 7)).toBe(true);
  });
});

describe('DemoSource', () => {
  const src = new DemoSource();

  it('filters by region, service and genre', async () => {
    const all = async (region: 'CA' | 'US') => {
      const names: string[] = [];
      for (let page = 1, total = 1; page <= total; page++) {
        const r = await src.browse({ region, providerIds: [], genreIds: [], text: '', page });
        total = r.totalPages;
        names.push(...r.shows.map((s) => s.name));
      }
      return names;
    };
    const caNames = await all('CA');
    expect(caNames).toContain('Prairie Doctors');
    expect(caNames).not.toContain('Bayou Blues');
    expect(await all('US')).toContain('Bayou Blues');
    expect(await all('US')).not.toContain('Prairie Doctors');

    const crave = await src.browse({ region: 'CA', providerIds: [230], genreIds: [18], text: '', page: 1 });
    expect(crave.shows.length).toBeGreaterThan(0);
    for (const s of crave.shows) {
      expect(s.providers!.map((p) => p.id)).toContain(230);
      expect(s.genreIds).toContain(18);
    }
  });

  it('builds schedules for every kind of show', async () => {
    const byName = (n: string) => DEMO_SHOWS.find((s) => s.name === n)!;
    const ended = await src.getSchedule(byName('Neon Nights'), today);
    expect(isFullyReleased(ended)).toBe(true);
    const premiere = await src.getSchedule(byName('The Last Orbit'), today);
    expect(premiere.newSeasons[0]).toMatchObject({ seasonNumber: 2, airDate: '2026-10-12' });
    const airing = await src.getSchedule(byName('Harbour Lights'), today);
    expect(airing.upcoming.length).toBeGreaterThan(0);
    expect(airing.newSeasons).toEqual([]);
    const announced = await src.getSchedule(byName('Wildlands'), today);
    expect(announced.newSeasons).toHaveLength(1);
    expect(announced.newSeasons[0]).toMatchObject({ seasonNumber: 3 });
    expect(announced.newSeasons[0].airDate).toBeUndefined();
  });
});
