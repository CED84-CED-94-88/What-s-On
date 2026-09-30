import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Poster } from '../components/Poster';
import { useAsync } from '../hooks/useAsync';
import { formatLong, formatShort, monthGrid, parseISODate, relativeDay, toISODate, todayISO } from '../lib/dates';
import { describeItem, groupByDay, isFullyReleased, premiereLabel, type DayItem } from '../lib/schedule';
import { useAppState } from '../state/AppState';
import type { SeasonAnnouncement, ShowSchedule } from '../types';

export function CalendarPage() {
  const { saved, source, toggleSaved } = useAppState();
  const today = todayISO();
  const [view, setView] = useState<'month' | 'list'>(() => (window.innerWidth < 720 ? 'list' : 'month'));
  const [cursor, setCursor] = useState(() => {
    const d = parseISODate(today);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const savedKey = saved.map((s) => s.id).join(',');
  const result = useAsync(async () => {
    const settled = await Promise.allSettled(saved.map((s) => source.getSchedule(s, today)));
    const schedules: ShowSchedule[] = [];
    const failed: string[] = [];
    settled.forEach((r, i) => (r.status === 'fulfilled' ? schedules.push(r.value) : failed.push(saved[i].name)));
    return { schedules, failed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey, source, today]);

  const schedules = useMemo(() => result.data?.schedules ?? [], [result.data]);
  const active = schedules.filter((s) => !isFullyReleased(s));
  const releasedCount = schedules.length - active.length;
  const byDay = useMemo(() => groupByDay(schedules), [schedules]);
  const newSeasons = useMemo(
    () =>
      schedules
        .flatMap((s) => s.newSeasons)
        .sort((a, b) => (a.airDate ?? '9999').localeCompare(b.airDate ?? '9999')),
    [schedules],
  );

  if (!saved.length) {
    return (
      <div className="page">
        <div className="empty">
          <h1>Your calendar is empty</h1>
          <p className="muted">Pick some shows and we'll show you when new episodes land.</p>
          <Link to="/" className="btn btn-primary">
            Browse shows
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <section className="hero">
        <h1>New episode calendar</h1>
        <p className="muted">
          Upcoming releases for your {saved.length} show{saved.length === 1 ? '' : 's'}.
        </p>
      </section>

      {result.loading && !result.data && <div className="notice">Loading release schedules…</div>}
      {result.error && <div className="notice notice-error">{result.error.message}</div>}
      {result.data && result.data.failed.length > 0 && (
        <div className="notice notice-error">Couldn't load schedules for: {result.data.failed.join(', ')}</div>
      )}

      {newSeasons.length > 0 && (
        <section className="new-seasons" aria-labelledby="new-seasons-h">
          <h2 id="new-seasons-h">
            <span aria-hidden>🎉</span> New seasons coming
          </h2>
          <div className="new-season-list">
            {newSeasons.map((s) => (
              <NewSeasonCard key={`${s.showId}-${s.seasonNumber}`} s={s} today={today} />
            ))}
          </div>
        </section>
      )}

      {result.data && active.length === 0 && (
        <div className="empty">
          <p>None of your shows have new episodes scheduled.</p>
          <p className="muted">Everything you follow has already been released — time to find something new!</p>
          <Link to="/" className="btn btn-primary">
            Browse shows
          </Link>
        </div>
      )}

      {byDay.size > 0 && (
        <>
          <div className="cal-toolbar">
            <div className="segmented" role="tablist" aria-label="Calendar view">
              <button type="button" role="tab" aria-selected={view === 'month'} onClick={() => setView('month')}>
                Month
              </button>
              <button type="button" role="tab" aria-selected={view === 'list'} onClick={() => setView('list')}>
                List
              </button>
            </div>
            {view === 'month' && (
              <div className="month-nav">
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-label="Previous month"
                  onClick={() => setCursor(({ year, month }) => (month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }))}
                >
                  ‹
                </button>
                <h2 className="month-title">
                  {new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-label="Next month"
                  onClick={() => setCursor(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }))}
                >
                  ›
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    const d = parseISODate(today);
                    setCursor({ year: d.getFullYear(), month: d.getMonth() });
                  }}
                >
                  Today
                </button>
              </div>
            )}
          </div>
          <div className="legend">
            <span className="pill">S01E04</span> new episode
            <span className="pill pill-premiere">★ Premiere</span> new season
          </div>
          {view === 'month' ? (
            <MonthView
              year={cursor.year}
              month={cursor.month}
              today={today}
              byDay={byDay}
              onNextMonth={() => setCursor(({ year, month }) => (month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }))}
            />
          ) : (
            <ListView today={today} byDay={byDay} />
          )}
        </>
      )}

      <section className="my-shows" aria-labelledby="my-shows-h">
        <h2 id="my-shows-h">Your shows</h2>
        <ul className="my-shows-list">
          {saved.map((s) => {
            const sched = schedules.find((x) => x.showId === s.id);
            const next = sched?.upcoming[0];
            return (
              <li key={s.id}>
                <Poster name={s.name} url={s.posterUrl} size="sm" />
                <div>
                  <strong>{s.name}</strong>
                  <div className="muted small">
                    {!sched
                      ? '…'
                      : next
                        ? `Next: ${describeItem({ ...next, date: next.airDate, episodes: [next], premiere: false })} · ${formatShort(next.airDate)}`
                        : sched.newSeasons.length
                          ? 'New season announced'
                          : 'All episodes released'}
                  </div>
                </div>
                <button type="button" className="icon-btn" aria-label={`Remove ${s.name}`} onClick={() => toggleSaved(s)}>
                  ×
                </button>
              </li>
            );
          })}
        </ul>
        {releasedCount > 0 && (
          <p className="muted small">
            {releasedCount} of your shows {releasedCount === 1 ? 'has' : 'have'} no upcoming episodes, so{' '}
            {releasedCount === 1 ? "it isn't" : "they aren't"} on the calendar.
          </p>
        )}
      </section>
    </div>
  );
}

function NewSeasonCard({ s, today }: { s: SeasonAnnouncement; today: string }) {
  return (
    <article className="new-season-card">
      <Poster name={s.showName} url={s.posterUrl} size="sm" />
      <div>
        <div className="ns-label">{premiereLabel(s.seasonNumber)}</div>
        <h3>{s.showName}</h3>
        {s.airDate ? (
          <p>
            <strong>{formatLong(s.airDate)}</strong>
            <span className="ns-rel">{relativeDay(today, s.airDate)}</span>
          </p>
        ) : (
          <p>
            <strong>Confirmed</strong>
            <span className="ns-rel">Release date TBA</span>
          </p>
        )}
      </div>
    </article>
  );
}

function ItemPill({ item }: { item: DayItem }) {
  const title = item.episodes.map((e) => `${e.showName} S${e.seasonNumber}E${e.episodeNumber} “${e.name}”`).join('\n');
  return (
    <div className={`pill ${item.premiere ? 'pill-premiere' : ''}`} title={title}>
      {item.premiere && <span className="pill-badge">★ {premiereLabel(item.episodes[0].seasonNumber)}</span>}
      <span className="pill-show">{item.showName}</span>
      <span className="pill-ep">{describeItem(item)}</span>
    </div>
  );
}

function MonthView({
  year,
  month,
  today,
  byDay,
  onNextMonth,
}: {
  year: number;
  month: number;
  today: string;
  byDay: Map<string, DayItem[]>;
  onNextMonth(): void;
}) {
  const weeks = monthGrid(year, month);
  const nextMonthStart = toISODate(new Date(year, month + 1, 1));
  const nextMonthEnd = toISODate(new Date(year, month + 2, 0));
  let nextCount = 0;
  for (const [d, items] of byDay) if (d >= nextMonthStart && d <= nextMonthEnd) nextCount += items.length;
  const nextName = parseISODate(nextMonthStart).toLocaleDateString(undefined, { month: 'long' });
  const weekdays = weeks[0].map((d) => parseISODate(d).toLocaleDateString(undefined, { weekday: 'short' }));
  const monthHasItems = weeks.flat().some((d) => parseISODate(d).getMonth() === month && byDay.has(d));
  return (
    <>
      <div className="month" role="grid">
        <div className="month-row month-head" role="row">
          {weekdays.map((w) => (
            <div key={w} role="columnheader">
              {w}
            </div>
          ))}
        </div>
        {weeks.map((week) => (
          <div className="month-row" role="row" key={week[0]}>
            {week.map((d) => {
              const date = parseISODate(d);
              const items = byDay.get(d) ?? [];
              const cls = [
                'day',
                date.getMonth() !== month && 'other-month',
                d === today && 'today',
                d < today && 'past',
                items.some((i) => i.premiere) && 'has-premiere',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <div key={d} className={cls} role="gridcell" aria-label={formatLong(d)}>
                  <span className="day-num">{date.getDate()}</span>
                  {items.map((item) => (
                    <ItemPill key={item.showId} item={item} />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {!monthHasItems && <p className="muted center">No releases this month — try the next one or switch to List view.</p>}
      {nextCount > 0 && (
        <div className="center next-month">
          <button type="button" className="btn btn-secondary" onClick={onNextMonth}>
            See {nextName} — {nextCount} release{nextCount === 1 ? '' : 's'} ›
          </button>
        </div>
      )}
    </>
  );
}

function ListView({ today, byDay }: { today: string; byDay: Map<string, DayItem[]> }) {
  return (
    <ol className="agenda">
      {[...byDay.entries()].map(([date, items]) => (
        <li key={date} className={items.some((i) => i.premiere) ? 'has-premiere' : ''}>
          <div className="agenda-date">
            <strong>{formatLong(date)}</strong>
            <span className="muted">{relativeDay(today, date)}</span>
          </div>
          <ul>
            {items.map((item) => (
              <li key={item.showId} className={`agenda-item ${item.premiere ? 'premiere' : ''}`}>
                <Poster name={item.showName} url={item.posterUrl} size="sm" />
                <div>
                  {item.premiere && <div className="ns-label">★ {premiereLabel(item.episodes[0].seasonNumber)}</div>}
                  <strong>{item.showName}</strong>
                  <div className="muted small">
                    {describeItem(item)}
                    {item.episodes.length === 1 && ` · “${item.episodes[0].name}”`}
                    {item.episodes.length > 1 && ' · released together'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
