import { HashRouter, Link, NavLink, Route, Routes } from 'react-router-dom';
import { BrowsePage } from './pages/BrowsePage';
import { CalendarPage } from './pages/CalendarPage';
import { SettingsPage } from './pages/SettingsPage';
import { AppStateProvider, useAppState } from './state/AppState';
import { REGIONS } from './types';

function Header() {
  const { region, setRegion, saved, source } = useAppState();
  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <span aria-hidden>📺</span> What's On
        </Link>
        <nav className="nav">
          <NavLink to="/" end>
            Browse
          </NavLink>
          <NavLink to="/calendar">
            Calendar{saved.length > 0 && <span className="badge">{saved.length}</span>}
          </NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
        <div className="segmented region" role="radiogroup" aria-label="Region">
          {REGIONS.map((r) => (
            <button
              key={r.code}
              type="button"
              role="radio"
              aria-checked={region === r.code}
              title={r.label}
              onClick={() => setRegion(r.code)}
            >
              <span aria-hidden>{r.flag}</span> {r.code}
            </button>
          ))}
        </div>
      </div>
      {source.kind === 'demo' && (
        <div className="demo-banner">
          Demo mode — showing a sample catalogue of fictional shows.{' '}
          <Link to="/settings">Add a free TMDB API key</Link> for real shows and air dates.
        </div>
      )}
    </header>
  );
}

export function App() {
  return (
    <AppStateProvider>
      <HashRouter>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<BrowsePage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<BrowsePage />} />
          </Routes>
        </main>
      </HashRouter>
    </AppStateProvider>
  );
}
