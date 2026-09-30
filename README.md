# What's On 📺

Browse TV shows streaming in **Canada or the US**, pick the ones you care about, and get a calendar of upcoming episodes — with new seasons called out loudly.

## Features

- **Region switch (🇨🇦 CA / 🇺🇸 US)** — the catalogue and the list of streaming services change with the country.
- **Multi-select filters** for streaming service and genre.
- **Smart search** — type naturally: `crime dramas on netflix`, `scifi crave`, `disney+ cartoons`, or a title with typos (`paralax`). Genre/service words become filters (shown as chips you can dismiss), the rest searches titles. Autocompletes services, genres and titles, with keyboard navigation.
- **My shows** — click a poster or "Add to my shows"; your picks are saved in the browser.
- **Calendar** — month grid and list views of upcoming episodes for your shows. Shows with everything already released are left off. Season/series premieres are highlighted, and a **"New seasons coming"** banner lists every upcoming or announced season (including "date TBA").

## Data

- **Live data (recommended):** add a free [TMDB API key](https://www.themoviedb.org/settings/api) on the Settings page (or set `VITE_TMDB_API_KEY` in `.env.local`). Either the v3 API key or the v4 read-access token works. Streaming availability per country comes from TMDB's watch-provider data (JustWatch); episode dates are TMDB air dates.
- **Demo mode:** with no key, the app uses a built-in catalogue of *fictional* shows whose schedules are generated relative to today, so everything works offline.

## Publishing

`.github/workflows/deploy.yml` builds the app and publishes it with GitHub Pages on every push.
One-time setup in the repository: **Settings → Pages → Source: GitHub Actions**
(on a free GitHub plan the repository must be public for Pages to work).
The site then lives at `https://<username>.github.io/What-s-On/`.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (search parsing, schedule logic, TMDB client with mocked fetch)
npm run build    # type-check + production build into dist/
```

Built with React, TypeScript, Vite and React Router (hash routing, so `dist/` can be hosted on any static host).

This product uses the TMDB API but is not endorsed or certified by TMDB.
