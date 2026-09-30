/** Date helpers working on local-calendar ISO dates (YYYY-MM-DD), avoiding timezone drift. */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function formatLong(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShort(iso: string): string {
  return parseISODate(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function daysBetween(fromISO: string, toISO: string): number {
  const ms = parseISODate(toISO).getTime() - parseISODate(fromISO).getTime();
  return Math.round(ms / 86_400_000);
}

export function relativeDay(today: string, iso: string): string {
  const n = daysBetween(today, iso);
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n < 7) return `In ${n} days`;
  if (n < 60) return `In ${Math.round(n / 7)} week${Math.round(n / 7) === 1 ? '' : 's'}`;
  return `In ${Math.round(n / 30)} months`;
}

/** 6x7 grid of ISO dates covering the month containing `year`/`month` (0-based), weeks starting Sunday. */
export function monthGrid(year: number, month: number): string[][] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const weeks: string[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(toISODate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + i)));
    }
    weeks.push(week);
  }
  // Drop a trailing week that lies entirely in the next month.
  const last = weeks[5];
  if (parseISODate(last[0]).getMonth() !== month) weeks.pop();
  return weeks;
}
