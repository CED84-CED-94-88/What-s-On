import type { Episode, SeasonAnnouncement, ShowSchedule } from '../types';

/** An episode that opens a season (season premiere or series premiere). */
export function isSeasonPremiere(ep: Pick<Episode, 'episodeNumber'>): boolean {
  return ep.episodeNumber === 1;
}

export function premiereLabel(seasonNumber: number): string {
  return seasonNumber <= 1 ? 'Series premiere' : `Season ${seasonNumber} premiere`;
}

export function episodeCode(ep: Pick<Episode, 'seasonNumber' | 'episodeNumber'>): string {
  return `S${String(ep.seasonNumber).padStart(2, '0')}E${String(ep.episodeNumber).padStart(2, '0')}`;
}

/**
 * Keep only episodes airing on/after `today`, sorted, and derive the "new season" notes:
 * every upcoming season premiere, plus any announced future season that has no dated episodes yet.
 */
export function finalizeSchedule(
  base: Omit<ShowSchedule, 'upcoming' | 'newSeasons'>,
  episodes: Episode[],
  announcedSeasons: SeasonAnnouncement[],
  today: string,
): ShowSchedule {
  const upcoming = episodes
    .filter((e) => e.airDate >= today)
    .sort((a, b) => a.airDate.localeCompare(b.airDate) || a.episodeNumber - b.episodeNumber);

  const bySeason = new Map<number, SeasonAnnouncement>();
  for (const ep of upcoming) {
    if (isSeasonPremiere(ep) && !bySeason.has(ep.seasonNumber)) {
      bySeason.set(ep.seasonNumber, {
        showId: ep.showId,
        showName: ep.showName,
        posterUrl: ep.posterUrl,
        seasonNumber: ep.seasonNumber,
        airDate: ep.airDate,
      });
    }
  }
  for (const s of announcedSeasons) {
    if (bySeason.has(s.seasonNumber)) continue;
    if (s.airDate && s.airDate < today) continue;
    // A season already underway (has upcoming non-premiere episodes) isn't "new".
    if (upcoming.some((e) => e.seasonNumber === s.seasonNumber)) continue;
    bySeason.set(s.seasonNumber, s);
  }

  const newSeasons = [...bySeason.values()].sort((a, b) =>
    (a.airDate ?? '9999').localeCompare(b.airDate ?? '9999'),
  );
  return { ...base, upcoming, newSeasons };
}

/** True when a schedule has nothing left to show on the calendar. */
export function isFullyReleased(s: ShowSchedule): boolean {
  return s.upcoming.length === 0 && s.newSeasons.length === 0;
}

/** One show's release(s) on one day; a binge drop of many episodes collapses into one item. */
export interface DayItem {
  showId: number;
  showName: string;
  posterUrl?: string;
  date: string;
  episodes: Episode[];
  premiere: boolean;
}

export function groupByDay(schedules: ShowSchedule[]): Map<string, DayItem[]> {
  const byKey = new Map<string, DayItem>();
  for (const s of schedules) {
    for (const ep of s.upcoming) {
      const key = `${ep.airDate}|${ep.showId}`;
      let item = byKey.get(key);
      if (!item) {
        item = { showId: ep.showId, showName: ep.showName, posterUrl: ep.posterUrl, date: ep.airDate, episodes: [], premiere: false };
        byKey.set(key, item);
      }
      item.episodes.push(ep);
      if (isSeasonPremiere(ep)) item.premiere = true;
    }
  }
  const byDay = new Map<string, DayItem[]>();
  for (const item of [...byKey.values()].sort((a, b) => a.date.localeCompare(b.date))) {
    item.episodes.sort((a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber);
    const list = byDay.get(item.date) ?? [];
    list.push(item);
    byDay.set(item.date, list);
  }
  for (const list of byDay.values()) list.sort((a, b) => Number(b.premiere) - Number(a.premiere) || a.showName.localeCompare(b.showName));
  return byDay;
}

export function describeItem(item: DayItem): string {
  const first = item.episodes[0];
  if (item.episodes.length === 1) return episodeCode(first);
  const last = item.episodes[item.episodes.length - 1];
  if (first.seasonNumber === last.seasonNumber) {
    return `S${String(first.seasonNumber).padStart(2, '0')} · ${item.episodes.length} episodes`;
  }
  return `${item.episodes.length} episodes`;
}
