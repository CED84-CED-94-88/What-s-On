import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DemoSource } from '../data/demo';
import { TmdbSource } from '../data/tmdb';
import type { DataSource, Region, SavedShow, Show } from '../types';

const STORAGE_KEY = 'whats-on:v1';

export type Theme = 'light' | 'dark';

interface Persisted {
  theme: Theme;
  region: Region;
  saved: SavedShow[];
  apiKey: string;
}

function load(): Persisted {
  const envKey = (import.meta.env.VITE_TMDB_API_KEY as string | undefined) ?? '';
  const fallback: Persisted = { theme: 'light', region: 'CA', saved: [], apiKey: envKey };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<Persisted>;
    return {
      theme: p.theme === 'dark' ? 'dark' : 'light',
      region: p.region === 'US' ? 'US' : 'CA',
      saved: Array.isArray(p.saved) ? p.saved : [],
      apiKey: p.apiKey || envKey,
    };
  } catch {
    return fallback;
  }
}

interface AppState {
  theme: Theme;
  setTheme(t: Theme): void;
  region: Region;
  setRegion(r: Region): void;
  saved: SavedShow[];
  isSaved(id: number): boolean;
  toggleSaved(show: Show | SavedShow): void;
  clearSaved(): void;
  apiKey: string;
  setApiKey(k: string): void;
  source: DataSource;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable (private mode etc.) — keep working in memory */
    }
  }, [state]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  const source = useMemo<DataSource>(
    () => (state.apiKey.trim() ? new TmdbSource(state.apiKey.trim()) : new DemoSource()),
    [state.apiKey],
  );

  const setTheme = useCallback((theme: Theme) => setState((s) => ({ ...s, theme })), []);
  const setRegion = useCallback((region: Region) => setState((s) => ({ ...s, region })), []);
  const setApiKey = useCallback(
    // Saved shows are tied to a catalogue (demo IDs ≠ TMDB IDs), so switching sources resets them.
    (apiKey: string) =>
      setState((s) => (s.apiKey.trim() === apiKey.trim() ? s : { ...s, apiKey: apiKey.trim(), saved: [] })),
    [],
  );
  const toggleSaved = useCallback(
    (show: Show | SavedShow) =>
      setState((s) => ({
        ...s,
        saved: s.saved.some((x) => x.id === show.id)
          ? s.saved.filter((x) => x.id !== show.id)
          : [...s.saved, { id: show.id, name: show.name, posterUrl: show.posterUrl }],
      })),
    [],
  );
  const clearSaved = useCallback(() => setState((s) => ({ ...s, saved: [] })), []);

  const value = useMemo<AppState>(
    () => ({
      theme: state.theme,
      setTheme,
      region: state.region,
      setRegion,
      saved: state.saved,
      isSaved: (id) => state.saved.some((x) => x.id === id),
      toggleSaved,
      clearSaved,
      apiKey: state.apiKey,
      setApiKey,
      source,
    }),
    [state, setTheme, setRegion, toggleSaved, clearSaved, setApiKey, source],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState must be used inside AppStateProvider');
  return v;
}
