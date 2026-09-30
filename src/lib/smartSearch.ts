import type { Genre, Provider } from '../types';

/**
 * "Smart" search: understands genre and streaming-service words inside free text
 * (e.g. "crime dramas on netflix", "scifi crave", "comdy disney+") and tolerates typos.
 * Whatever isn't recognised as a filter is treated as title text.
 */

export interface DetectedFilter {
  kind: 'genre' | 'provider';
  id: number;
  name: string;
  /** The words in the query that produced this match. */
  phrase: string;
}

export interface ParsedQuery {
  text: string;
  filters: DetectedFilter[];
}

const GENRE_ALIASES: Record<string, string[]> = {
  comedy: ['comedies', 'funny', 'sitcom', 'sitcoms'],
  drama: ['dramas'],
  crime: ['true crime', 'detective', 'police'],
  documentary: ['documentaries', 'docs', 'docuseries'],
  animation: ['animated', 'anime', 'cartoon', 'cartoons'],
  kids: ['children', 'childrens', 'kid'],
  family: ['families'],
  mystery: ['mysteries', 'thriller', 'thrillers', 'whodunit'],
  reality: ['reality tv', 'competition'],
  'sci-fi & fantasy': ['sci-fi', 'scifi', 'sci fi', 'science fiction', 'fantasy'],
  'action & adventure': ['action', 'adventure'],
  'war & politics': ['war', 'politics', 'political'],
  western: ['westerns', 'cowboy'],
  talk: ['talk show', 'talk shows', 'late night'],
  soap: ['soaps', 'soap opera'],
  news: ['current affairs'],
};

const PROVIDER_ALIASES: [RegExp, string[]][] = [
  [/netflix/i, ['netflix']],
  [/amazon|prime/i, ['prime', 'prime video', 'amazon', 'amazon prime']],
  [/disney/i, ['disney', 'disney+', 'disney plus', 'disneyplus']],
  [/apple/i, ['apple', 'apple tv', 'apple tv+', 'apple tv plus', 'appletv']],
  [/^max$|hbo/i, ['max', 'hbo', 'hbo max']],
  [/hulu/i, ['hulu']],
  [/paramount/i, ['paramount', 'paramount+', 'paramount plus']],
  [/peacock/i, ['peacock']],
  [/crave/i, ['crave']],
  [/cbc/i, ['cbc', 'cbc gem', 'gem']],
  [/britbox/i, ['britbox']],
  [/stack ?tv/i, ['stacktv', 'stack tv']],
];

const CONNECTORS = new Set([
  'on', 'in', 'at', 'streaming', 'stream', 'shows', 'show', 'series', 'tv', 'and', 'or', 'with', 'from', 'available', 'new', 'good', 'best',
]);

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\+/g, ' plus ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Typo allowance for a single word of a given length. */
function allowedTypos(len: number): number {
  if (len >= 8) return 2;
  if (len >= 5) return 1;
  return 0;
}

function wordsMatch(queryWords: string[], phraseWords: string[], fuzzy: boolean): boolean {
  if (queryWords.length !== phraseWords.length) return false;
  return phraseWords.every((pw, i) => {
    const qw = queryWords[i];
    if (qw === pw) return true;
    // Allow a trailing plural "s" on longer words ("dramas", "westerns").
    if (pw.length >= 4 && (qw === `${pw}s` || pw === `${qw}s`)) return true;
    return fuzzy && levenshtein(qw, pw) <= allowedTypos(pw.length);
  });
}

interface Vocab {
  kind: DetectedFilter['kind'];
  id: number;
  name: string;
  words: string[];
}

function buildVocab(genres: Genre[], providers: Provider[]): Vocab[] {
  const vocab: Vocab[] = [];
  const add = (kind: Vocab['kind'], id: number, name: string, phrase: string) => {
    const words = normalize(phrase).split(' ').filter(Boolean);
    if (words.length) vocab.push({ kind, id, name, words });
  };
  for (const g of genres) {
    add('genre', g.id, g.name, g.name);
    for (const alias of GENRE_ALIASES[g.name.toLowerCase()] ?? []) add('genre', g.id, g.name, alias);
  }
  for (const p of providers) {
    add('provider', p.id, p.name, p.name);
    for (const [re, aliases] of PROVIDER_ALIASES) {
      if (re.test(p.name)) aliases.forEach((a) => add('provider', p.id, p.name, a));
    }
  }
  // Longest phrases first so "science fiction" wins over "fiction"-style partials.
  return vocab.sort((a, b) => b.words.length - a.words.length);
}

export function filterKey(f: Pick<DetectedFilter, 'kind' | 'id'>): string {
  return `${f.kind}:${f.id}`;
}

/**
 * @param ignored filter keys (see `filterKey`) the user dismissed; their words stay title text.
 */
export function parseQuery(
  query: string,
  genres: Genre[],
  providers: Provider[],
  ignored: ReadonlySet<string> = new Set(),
): ParsedQuery {
  const words = normalize(query).split(' ').filter(Boolean);
  const vocab = buildVocab(genres, providers).filter((v) => !ignored.has(filterKey(v)));
  const used = new Array(words.length).fill(false);
  const filters: DetectedFilter[] = [];

  for (let i = 0; i < words.length; i++) {
    if (used[i]) continue;
    // Exact matches win over typo matches ("prime" is Prime Video, not a typo of "crime").
    const hit =
      vocab.find((v) => i + v.words.length <= words.length && wordsMatch(words.slice(i, i + v.words.length), v.words, false)) ??
      vocab.find((v) => i + v.words.length <= words.length && wordsMatch(words.slice(i, i + v.words.length), v.words, true));
    if (!hit) continue;
    const n = hit.words.length;
    for (let k = i; k < i + n; k++) used[k] = true;
    if (!filters.some((f) => f.kind === hit.kind && f.id === hit.id)) {
      filters.push({ kind: hit.kind, id: hit.id, name: hit.name, phrase: words.slice(i, i + n).join(' ') });
    }
  }

  let rest = words.filter((_, i) => !used[i]);
  // Once we've understood filters, connector words ("dramas ON netflix") are noise.
  if (filters.length) rest = rest.filter((w) => !CONNECTORS.has(w));
  return { text: rest.join(' '), filters };
}

/**
 * Relevance of `target` (a title) to `query`: 0 = no match, higher is better.
 * Handles substrings, word prefixes and small typos.
 */
export function fuzzyScore(query: string, target: string): number {
  const q = normalize(query);
  const t = normalize(target);
  if (!q) return 1;
  if (t === q) return 100;
  if (t.startsWith(q)) return 90;
  if (t.includes(q)) return 75;

  const qWords = q.split(' ');
  const tWords = t.split(' ');
  let total = 0;
  for (const qw of qWords) {
    let best = 0;
    for (const tw of tWords) {
      if (tw === qw) best = Math.max(best, 1);
      else if (tw.startsWith(qw)) best = Math.max(best, 0.85);
      else {
        const d = levenshtein(qw, tw.slice(0, Math.max(qw.length, tw.length)));
        if (d <= allowedTypos(qw.length)) best = Math.max(best, 0.7 - d * 0.1);
      }
    }
    if (best === 0) return 0;
    total += best;
  }
  return Math.round((total / qWords.length) * 60);
}

/**
 * Autocomplete for the word being typed: genres/services whose name or alias starts with it.
 * Filters already present in the query are skipped.
 */
export function suggestFilters(
  query: string,
  genres: Genre[],
  providers: Provider[],
  already: DetectedFilter[],
  limit = 4,
): DetectedFilter[] {
  const words = normalize(query).split(' ').filter(Boolean);
  const last = words[words.length - 1];
  if (!last || last.length < 2 || /\s$/.test(query)) return [];
  const out: DetectedFilter[] = [];
  for (const v of buildVocab(genres, providers)) {
    if (out.length >= limit) break;
    const phrase = v.words.join(' ');
    if (!phrase.startsWith(last) || phrase === last) continue;
    if (already.some((f) => f.kind === v.kind && f.id === v.id)) continue;
    if (out.some((f) => f.kind === v.kind && f.id === v.id)) continue;
    out.push({ kind: v.kind, id: v.id, name: v.name, phrase: last });
  }
  return out;
}

/** Replace the last word of `query` with `replacement` (used when accepting a suggestion). */
export function replaceLastWord(query: string, replacement: string): string {
  return query.replace(/\S*$/, replacement) + ' ';
}
