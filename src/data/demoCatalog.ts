import type { Genre, Provider, Region } from '../types';

/**
 * Built-in sample catalogue used when no TMDB API key is configured.
 * All titles are fictional; release schedules are generated relative to today
 * so the calendar always has something to show.
 */

export const DEMO_GENRES: Genre[] = [
  { id: 10759, name: 'Action & Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 10762, name: 'Kids' },
  { id: 9648, name: 'Mystery' },
  { id: 10764, name: 'Reality' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10768, name: 'War & Politics' },
  { id: 37, name: 'Western' },
];

const P = {
  netflix: { id: 8, name: 'Netflix' },
  prime: { id: 9, name: 'Amazon Prime Video' },
  disney: { id: 337, name: 'Disney Plus' },
  apple: { id: 350, name: 'Apple TV+' },
  paramount: { id: 531, name: 'Paramount Plus' },
  crave: { id: 230, name: 'Crave' },
  cbc: { id: 326, name: 'CBC Gem' },
  hulu: { id: 15, name: 'Hulu' },
  max: { id: 1899, name: 'Max' },
  peacock: { id: 386, name: 'Peacock' },
} satisfies Record<string, Provider>;

type PKey = keyof typeof P;

export const DEMO_PROVIDERS: Record<Region, Provider[]> = {
  CA: [P.netflix, P.prime, P.disney, P.crave, P.apple, P.paramount, P.cbc],
  US: [P.netflix, P.prime, P.disney, P.hulu, P.max, P.apple, P.paramount, P.peacock],
};

export type DemoSchedule =
  /** Season in progress: started `startedDaysAgo`, `episodes` total, one every `every` days. */
  | { kind: 'airing'; season: number; episodes: number; startedDaysAgo: number; every?: number }
  /** New season premieres in `inDays`; `every: 0` means the whole season drops at once. */
  | { kind: 'premiere'; season: number; episodes: number; inDays: number; every?: number }
  /** A new season is confirmed but has no date yet. */
  | { kind: 'announced'; season: number }
  /** Everything has been released. */
  | { kind: 'ended'; seasons: number };

export interface DemoShow {
  id: number;
  name: string;
  overview: string;
  genres: number[];
  firstAired: number;
  rating: number;
  CA: PKey[];
  US: PKey[];
  schedule: DemoSchedule;
}

const G = { action: 10759, animation: 16, comedy: 35, crime: 80, doc: 99, drama: 18, family: 10751, kids: 10762, mystery: 9648, reality: 10764, scifi: 10765, war: 10768, western: 37 };

export const DEMO_SHOWS: DemoShow[] = [
  { id: 9001, name: 'Harbour Lights', overview: 'A small-town Nova Scotia harbourmaster uncovers a smuggling ring hidden in the fishing fleet.', genres: [G.crime, G.drama], firstAired: 2022, rating: 8.1, CA: ['crave'], US: ['max'], schedule: { kind: 'airing', season: 3, episodes: 10, startedDaysAgo: 21 } },
  { id: 9002, name: 'The Last Orbit', overview: 'The crew of a failing space station must decide who gets the final ride home.', genres: [G.scifi, G.drama], firstAired: 2023, rating: 8.6, CA: ['apple'], US: ['apple'], schedule: { kind: 'premiere', season: 2, episodes: 9, inDays: 12 } },
  { id: 9003, name: 'Office Hours', overview: 'Mockumentary following an overworked university IT help desk.', genres: [G.comedy], firstAired: 2019, rating: 7.8, CA: ['prime'], US: ['peacock'], schedule: { kind: 'airing', season: 5, episodes: 12, startedDaysAgo: 35 } },
  { id: 9004, name: 'Northern Frontier', overview: 'Gold-rush era Yukon, where a disgraced Mountie hunts a killer across the ice.', genres: [G.western, G.drama], firstAired: 2021, rating: 8.3, CA: ['cbc', 'netflix'], US: ['netflix'], schedule: { kind: 'premiere', season: 4, episodes: 8, inDays: 26 } },
  { id: 9005, name: 'Kitchen Wars', overview: 'Twelve home cooks battle through themed challenges for a restaurant of their own.', genres: [G.reality], firstAired: 2020, rating: 6.9, CA: ['crave'], US: ['hulu'], schedule: { kind: 'airing', season: 6, episodes: 14, startedDaysAgo: 49 } },
  { id: 9006, name: 'Starlight Academy', overview: 'Young wizards-in-training juggle homework, rivalries and a looming dark prophecy.', genres: [G.animation, G.kids, G.scifi], firstAired: 2024, rating: 7.4, CA: ['disney'], US: ['disney'], schedule: { kind: 'airing', season: 2, episodes: 20, startedDaysAgo: 70 } },
  { id: 9007, name: 'Blackwater Bay', overview: 'Two estranged sisters inherit a lakeside motel — and the bodies buried beneath it.', genres: [G.mystery, G.drama], firstAired: 2023, rating: 8.0, CA: ['netflix'], US: ['netflix'], schedule: { kind: 'premiere', season: 3, episodes: 8, inDays: 5, every: 0 } },
  { id: 9008, name: 'The Understudies', overview: 'A backstage comedy about the stand-ins of a struggling Broadway musical.', genres: [G.comedy, G.drama], firstAired: 2022, rating: 7.6, CA: ['disney'], US: ['hulu'], schedule: { kind: 'ended', seasons: 3 } },
  { id: 9009, name: 'Wildlands', overview: 'Stunning natural-history series exploring the last untouched places on Earth.', genres: [G.doc], firstAired: 2021, rating: 9.0, CA: ['netflix', 'cbc'], US: ['netflix'], schedule: { kind: 'announced', season: 3 } },
  { id: 9010, name: 'Code Red', overview: 'An emergency-room drama told in real time across a single chaotic shift per season.', genres: [G.drama], firstAired: 2018, rating: 8.2, CA: ['prime', 'crave'], US: ['max'], schedule: { kind: 'airing', season: 7, episodes: 15, startedDaysAgo: 14 } },
  { id: 9011, name: 'Iron Legion', overview: 'Mercenaries protect a remote mining colony from a corporate army.', genres: [G.action, G.scifi], firstAired: 2024, rating: 7.9, CA: ['prime'], US: ['prime'], schedule: { kind: 'premiere', season: 2, episodes: 8, inDays: 40 } },
  { id: 9012, name: 'Maple & Main', overview: 'A heartwarming ensemble comedy set in a family-run Ontario hardware store.', genres: [G.comedy, G.family], firstAired: 2017, rating: 8.4, CA: ['cbc'], US: ['hulu'], schedule: { kind: 'ended', seasons: 6 } },
  { id: 9013, name: 'The Senate', overview: 'Power, betrayal and backroom deals in a fictional Washington.', genres: [G.war, G.drama], firstAired: 2020, rating: 8.5, CA: ['crave'], US: ['max'], schedule: { kind: 'premiere', season: 4, episodes: 10, inDays: 58 } },
  { id: 9014, name: 'Tiny Tails', overview: 'Pre-school animated adventures of four curious forest animals.', genres: [G.animation, G.kids, G.family], firstAired: 2021, rating: 7.1, CA: ['netflix'], US: ['netflix'], schedule: { kind: 'airing', season: 4, episodes: 26, startedDaysAgo: 30, every: 3 } },
  { id: 9015, name: 'Cold Case Unit', overview: 'Detectives reopen the files nobody else wanted.', genres: [G.crime, G.mystery], firstAired: 2016, rating: 7.7, CA: ['paramount', 'crave'], US: ['paramount'], schedule: { kind: 'airing', season: 9, episodes: 13, startedDaysAgo: 7 } },
  { id: 9016, name: 'Parallax', overview: 'A physicist discovers each decision she makes spawns a new timeline — and they are colliding.', genres: [G.scifi, G.mystery], firstAired: 2025, rating: 8.8, CA: ['apple'], US: ['apple'], schedule: { kind: 'airing', season: 1, episodes: 10, startedDaysAgo: 28 } },
  { id: 9017, name: 'Love on the Rocks', overview: 'Couples retreat to a remote island to test whether their relationships can survive.', genres: [G.reality], firstAired: 2022, rating: 5.8, CA: ['netflix'], US: ['netflix'], schedule: { kind: 'premiere', season: 5, episodes: 10, inDays: 19, every: 7 } },
  { id: 9018, name: 'Ghosts of Galveston', overview: 'A paranormal investigator returns home to face the haunting that started it all.', genres: [G.mystery, G.drama], firstAired: 2023, rating: 7.3, CA: ['paramount'], US: ['peacock'], schedule: { kind: 'ended', seasons: 2 } },
  { id: 9019, name: 'Rookie Season', overview: 'Behind-the-scenes documentary following first-year pro hockey players.', genres: [G.doc], firstAired: 2024, rating: 8.2, CA: ['prime', 'crave'], US: ['prime'], schedule: { kind: 'premiere', season: 2, episodes: 6, inDays: 33 } },
  { id: 9020, name: 'The Crown Jewels', overview: 'A crew of retired thieves plan one last heist in London.', genres: [G.crime, G.comedy], firstAired: 2025, rating: 7.9, CA: ['prime'], US: ['prime'], schedule: { kind: 'premiere', season: 1, episodes: 8, inDays: 16, every: 0 } },
  { id: 9021, name: 'Dragonmere', overview: 'Epic fantasy of rival houses battling for the last dragon eggs.', genres: [G.scifi, G.action, G.drama], firstAired: 2022, rating: 8.7, CA: ['crave'], US: ['max'], schedule: { kind: 'announced', season: 3 } },
  { id: 9022, name: 'Saturday Sketch', overview: 'Weekly live sketch comedy with rotating celebrity hosts.', genres: [G.comedy], firstAired: 2015, rating: 7.0, CA: ['cbc'], US: ['peacock'], schedule: { kind: 'airing', season: 11, episodes: 21, startedDaysAgo: 3 } },
  { id: 9023, name: 'Hidden Hands', overview: 'Investigative docuseries on the global counterfeit goods trade.', genres: [G.doc, G.crime], firstAired: 2023, rating: 7.8, CA: ['netflix'], US: ['netflix'], schedule: { kind: 'ended', seasons: 1 } },
  { id: 9024, name: 'Mech Pilots', overview: 'Anime-style saga of teenage pilots defending the last city.', genres: [G.animation, G.action, G.scifi], firstAired: 2023, rating: 8.1, CA: ['netflix'], US: ['hulu'], schedule: { kind: 'airing', season: 2, episodes: 12, startedDaysAgo: 42 } },
  { id: 9025, name: 'The Family Plot', overview: 'A funeral-home family comedy about grief, inheritance and very bad ideas.', genres: [G.comedy, G.drama], firstAired: 2021, rating: 8.0, CA: ['disney'], US: ['hulu'], schedule: { kind: 'premiere', season: 4, episodes: 10, inDays: 9 } },
  { id: 9026, name: 'Trench', overview: 'A WWI drama following a single Canadian battalion from Ypres to Vimy Ridge.', genres: [G.war, G.drama], firstAired: 2024, rating: 8.9, CA: ['cbc', 'crave'], US: ['paramount'], schedule: { kind: 'ended', seasons: 1 } },
  { id: 9027, name: 'Pixel Pals', overview: 'Two video-game characters escape into the real world.', genres: [G.animation, G.comedy, G.family], firstAired: 2025, rating: 7.2, CA: ['disney'], US: ['disney'], schedule: { kind: 'premiere', season: 1, episodes: 10, inDays: 23 } },
  { id: 9028, name: 'Dust Devils', overview: 'Ranch families feud over water rights in modern-day Montana.', genres: [G.western, G.drama], firstAired: 2020, rating: 8.3, CA: ['paramount'], US: ['paramount', 'peacock'], schedule: { kind: 'airing', season: 5, episodes: 10, startedDaysAgo: 56 } },
  { id: 9029, name: 'Unsolved North', overview: 'True-crime series revisiting the most puzzling cases in Canadian history.', genres: [G.doc, G.crime, G.mystery], firstAired: 2022, rating: 7.6, CA: ['cbc'], US: ['prime'], schedule: { kind: 'premiere', season: 3, episodes: 6, inDays: 2 } },
  { id: 9030, name: 'Neon Nights', overview: 'A synth-soaked 1980s crime drama in Miami.', genres: [G.crime, G.drama], firstAired: 2019, rating: 7.5, CA: ['netflix'], US: ['netflix'], schedule: { kind: 'ended', seasons: 4 } },
  { id: 9031, name: 'Home Flip', overview: 'Contractors race to renovate derelict houses on a shoestring budget.', genres: [G.reality], firstAired: 2018, rating: 6.8, CA: ['crave'], US: ['max'], schedule: { kind: 'airing', season: 8, episodes: 16, startedDaysAgo: 63 } },
  { id: 9032, name: 'Signal Lost', overview: 'After a global blackout, a radio operator becomes the only link between survivors.', genres: [G.scifi, G.drama, G.mystery], firstAired: 2024, rating: 8.4, CA: ['prime'], US: ['prime'], schedule: { kind: 'announced', season: 2 } },
  { id: 9033, name: 'Scout Troop 44', overview: 'A misfit scout troop stumbles onto a real treasure map.', genres: [G.family, G.action, G.kids], firstAired: 2023, rating: 7.4, CA: ['disney'], US: ['disney'], schedule: { kind: 'ended', seasons: 2 } },
  { id: 9034, name: 'Tenure Track', overview: 'Satirical comedy about the first woman to chair a stuffy English department.', genres: [G.comedy], firstAired: 2021, rating: 7.0, CA: ['netflix'], US: ['netflix'], schedule: { kind: 'announced', season: 2 } },
  { id: 9035, name: 'Paper Empire', overview: 'A newspaper dynasty fights for survival in the digital age.', genres: [G.drama], firstAired: 2020, rating: 8.2, CA: ['crave'], US: ['max'], schedule: { kind: 'airing', season: 4, episodes: 9, startedDaysAgo: 49 } },
  { id: 9036, name: 'Deep Current', overview: 'Navy divers recover sunken secrets during the Cold War.', genres: [G.action, G.war, G.drama], firstAired: 2025, rating: 7.8, CA: ['paramount'], US: ['paramount'], schedule: { kind: 'premiere', season: 2, episodes: 10, inDays: 75 } },
  { id: 9037, name: 'Quiz Night Live', overview: 'The biggest trivia competition on television, live every week.', genres: [G.reality, G.family], firstAired: 2019, rating: 6.5, CA: ['cbc'], US: ['peacock'], schedule: { kind: 'airing', season: 7, episodes: 30, startedDaysAgo: 90 } },
  { id: 9038, name: 'Moonrise', overview: 'Supernatural teen drama where a coastal town transforms every full moon.', genres: [G.scifi, G.drama], firstAired: 2022, rating: 7.1, CA: ['prime'], US: ['hulu'], schedule: { kind: 'premiere', season: 3, episodes: 10, inDays: 47, every: 0 } },
  { id: 9039, name: 'Chef on Wheels', overview: 'A celebrity chef road-trips across North America in a food truck.', genres: [G.doc, G.reality], firstAired: 2023, rating: 7.9, CA: ['disney'], US: ['disney', 'hulu'], schedule: { kind: 'airing', season: 3, episodes: 8, startedDaysAgo: 10 } },
  { id: 9040, name: 'Lawless', overview: 'Legal thriller about a defence attorney who never loses — until now.', genres: [G.crime, G.drama], firstAired: 2021, rating: 8.0, CA: ['apple'], US: ['apple'], schedule: { kind: 'ended', seasons: 3 } },
  // Region exclusives, so switching country visibly changes the catalogue.
  { id: 9041, name: 'Prairie Doctors', overview: 'Rural medical drama about a two-doctor clinic in small-town Saskatchewan.', genres: [G.drama, G.family], firstAired: 2020, rating: 7.9, CA: ['cbc'], US: [], schedule: { kind: 'airing', season: 5, episodes: 10, startedDaysAgo: 17 } },
  { id: 9042, name: 'Hockey Night Heroes', overview: 'Animated comedy about a hapless junior hockey team.', genres: [G.animation, G.comedy], firstAired: 2024, rating: 7.3, CA: ['crave'], US: [], schedule: { kind: 'premiere', season: 2, episodes: 10, inDays: 30 } },
  { id: 9043, name: 'Bayou Blues', overview: 'A Louisiana detective and a jazz musician team up to solve murders in New Orleans.', genres: [G.crime, G.mystery], firstAired: 2023, rating: 7.7, CA: [], US: ['hulu'], schedule: { kind: 'airing', season: 2, episodes: 10, startedDaysAgo: 24 } },
  { id: 9044, name: 'Main Street USA', overview: 'Documentary portraits of small businesses keeping American towns alive.', genres: [G.doc], firstAired: 2022, rating: 7.5, CA: [], US: ['peacock'], schedule: { kind: 'premiere', season: 3, episodes: 8, inDays: 14 } },
];

export function demoProviders(show: DemoShow, region: Region): Provider[] {
  return show[region].map((k) => P[k]);
}
