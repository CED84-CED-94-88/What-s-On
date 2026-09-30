import { useState } from 'react';
import { TmdbSource } from '../data/tmdb';
import { useAppState } from '../state/AppState';

export function SettingsPage() {
  const { apiKey, setApiKey, source, saved } = useAppState();
  const [draft, setDraft] = useState(apiKey);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error' | 'busy'; msg: string } | null>(null);

  const save = async () => {
    const key = draft.trim();
    if (key) {
      setStatus({ kind: 'busy', msg: 'Checking key…' });
      try {
        await new TmdbSource(key).validate();
      } catch (e) {
        setStatus({ kind: 'error', msg: e instanceof Error ? e.message : String(e) });
        return;
      }
    }
    if (key !== apiKey.trim() && saved.length && !confirm('Switching data source clears your selected shows. Continue?')) {
      setStatus(null);
      return;
    }
    setApiKey(key);
    setStatus({ kind: 'ok', msg: key ? 'Connected to TMDB — live data enabled.' : 'Using the built-in demo catalogue.' });
  };

  return (
    <div className="page narrow">
      <section className="hero">
        <h1>Settings</h1>
      </section>

      <section className="panel">
        <h2>Data source</h2>
        <p>
          Currently using:{' '}
          <strong>{source.kind === 'tmdb' ? 'Live data from TMDB' : 'Demo catalogue (fictional shows)'}</strong>
        </p>
        <p className="muted">
          For real shows, streaming availability for Canada and the US, and real episode air dates, add a free{' '}
          <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">
            TMDB API key
          </a>{' '}
          (either the v3 “API Key” or the v4 “API Read Access Token”). It's stored only in this browser.
        </p>
        <form
          className="key-form"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <input
            type="password"
            autoComplete="off"
            placeholder="Paste TMDB API key"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-label="TMDB API key"
          />
          <button type="submit" className="btn btn-primary" disabled={status?.kind === 'busy'}>
            Save
          </button>
          {apiKey && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setDraft('');
                if (!saved.length || confirm('Switching data source clears your selected shows. Continue?')) {
                  setApiKey('');
                  setStatus({ kind: 'ok', msg: 'Using the built-in demo catalogue.' });
                }
              }}
            >
              Use demo data
            </button>
          )}
        </form>
        {status && <div className={`notice ${status.kind === 'error' ? 'notice-error' : ''}`}>{status.msg}</div>}
      </section>

      <section className="panel">
        <h2>About the data</h2>
        <ul className="muted">
          <li>Streaming availability comes from TMDB's watch-provider data (powered by JustWatch) for the selected country.</li>
          <li>Episode dates are original release dates; streaming services may post episodes a few hours later.</li>
          <li>This product uses the TMDB API but is not endorsed or certified by TMDB.</li>
        </ul>
      </section>
    </div>
  );
}
