import { describe, expect, it } from 'vitest';
import { DEMO_GENRES, DEMO_PROVIDERS } from '../data/demoCatalog';
import { filterKey, fuzzyScore, parseQuery, suggestFilters } from './smartSearch';

const genres = DEMO_GENRES;
const providers = [...DEMO_PROVIDERS.CA, ...DEMO_PROVIDERS.US.filter((p) => !DEMO_PROVIDERS.CA.includes(p))];
const names = (q: string) => parseQuery(q, genres, providers).filters.map((f) => f.name);

describe('parseQuery', () => {
  it('pulls genres and services out of free text', () => {
    const p = parseQuery('crime dramas on netflix', genres, providers);
    expect(p.filters.map((f) => f.name)).toEqual(['Crime', 'Drama', 'Netflix']);
    expect(p.text).toBe('');
  });

  it('understands aliases and punctuation', () => {
    expect(names('scifi crave')).toEqual(['Sci-Fi & Fantasy', 'Crave']);
    expect(names('disney+ cartoons')).toEqual(['Disney Plus', 'Animation']);
    expect(names('science fiction on apple tv+')).toEqual(['Sci-Fi & Fantasy', 'Apple TV+']);
    expect(names('hbo documentaries')).toEqual(['Max', 'Documentary']);
  });

  it('tolerates typos but prefers exact matches', () => {
    expect(names('comdy netflx')).toEqual(['Comedy', 'Netflix']);
    expect(names('prime')).toEqual(['Amazon Prime Video']);
    expect(names('crime')).toEqual(['Crime']);
  });

  it('keeps unrecognised words as title text', () => {
    const p = parseQuery('harbour lights crave', genres, providers);
    expect(p.text).toBe('harbour lights');
    expect(p.filters.map((f) => f.name)).toEqual(['Crave']);
    expect(parseQuery('the last orbit', genres, providers)).toEqual({ text: 'the last orbit', filters: [] });
  });

  it('respects dismissed filters', () => {
    const war = parseQuery('kitchen war', genres, providers);
    expect(war.filters.map((f) => f.name)).toEqual(['War & Politics']);
    const ignored = new Set([filterKey(war.filters[0])]);
    expect(parseQuery('kitchen war', genres, providers, ignored)).toEqual({ text: 'kitchen war', filters: [] });
  });
});

describe('suggestFilters', () => {
  it('completes the word being typed', () => {
    expect(suggestFilters('dra', genres, providers, []).map((f) => f.name)).toContain('Drama');
    expect(suggestFilters('net', genres, providers, []).map((f) => f.name)).toEqual(['Netflix']);
    expect(suggestFilters('net ', genres, providers, [])).toEqual([]);
  });
});

describe('fuzzyScore', () => {
  it('ranks exact > prefix > typo and rejects misses', () => {
    const exact = fuzzyScore('parallax', 'Parallax');
    const prefix = fuzzyScore('para', 'Parallax');
    const typo = fuzzyScore('paralax', 'Parallax');
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(typo);
    expect(typo).toBeGreaterThan(0);
    expect(fuzzyScore('zebra', 'Parallax')).toBe(0);
  });
});
