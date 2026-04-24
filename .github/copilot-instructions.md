# Copilot Instructions — AniWatch Order

## Overview

Static anime watch-order guide site. **No frameworks, no build step** — vanilla JS, HTML, CSS deployed directly to GitHub Pages on push to `main`.

## Deployment

Push to `main` triggers `.github/workflows/jekyll-gh-pages.yml`, which uploads the entire repo root as a GitHub Pages artifact. There is no build, bundling, or compilation step.

## Page Structure

Every page lives **one directory deep** from the repo root (`home/`, `browse/`, `tensura/`, `about/`, `faq/`). Because of this flat structure, all relative paths between sibling pages and root-level assets use `../` as the prefix. The root `index.html` is just a redirect to `home/`.

### Shared scripts (loaded by every page)

| File | Purpose |
|---|---|
| `shared.js` | Navigation, footer, and search — injected at runtime. Fetches `data/index.json` for search suggestions. |
| `app.js` | Watch-order series page logic. Reads `data-anime-guid` attribute from `<main>` and fetches `data/{guid}/info.json` + `order.json` to render the page. |

### Page-specific scripts

| File | Used by |
|---|---|
| `home/home.js` | Home page — catalog cards, featured carousel, anime detail modal, continue-watching section. Also defines shared helpers (`createHomeAnimeCard`, `fetchIndexCatalogModels`, etc.) used by `browse/browse.js`. |
| `browse/browse.js` | Browse page — paginated grid, search filtering via `?q=` query param. Depends on functions from `home/home.js` (loaded before it). |
| `tools/tools.js` | Data editor UI — generates `info.json` and `order.json` via browser download. |

### Single CSS file

`style.css` at the root covers the entire site. Uses **CSS custom properties** for theming with a `[data-color-scheme="dark"]` selector for dark mode.

## Adding a New Anime Series

This is the most common contribution workflow:

1. **Create data files** in `data/{guid}/`:
   - `info.json` — series metadata (see schema below)
   - `order.json` — watch order entries for recommended, chronological, and release tabs

2. **Add images** to `images/`:
   - `{guid}.jpg` — thumbnail
   - `{guid}-banner.jpg` — banner

3. **Generate the page**: `node tools/generate-page.js <guid>`
   - Creates `{guid}/index.html` from `tools/template.html`
   - Adds the series to `data/index.json`
   - Adds the URL to `sitemap_index.xml` (with `<lastmod>` set to today; updates `<lastmod>` on regeneration)

The template uses `{{GUID}}`, `{{TITLE_MAIN}}`, and `{{TITLE_SHORT}}` placeholders.

### info.json schema

```json
{
  "guid": "tensura",
  "title": {
    "main": "That Time I Got Reincarnated as a Slime",
    "alt": ["転生したらスライムだった件", "Tensei Shitara Slime Datta Ken", "Tensura"]
  },
  "studio": ["8-bit"],
  "description": "...",
  "season": "FALL",
  "year": 2018,
  "banner": "/images/tensura-banner.jpg",
  "thumbnail": "/images/tensura.jpg",
  "mal": "https://myanimelist.net/anime/...",
  "genre": ["Adventure", "Fantasy"],
  "status": "Ongoing",
  "contributors": ["Otaku-Save-Terra"]
}
```

Valid values for `season`, `genre`, `status`, and `tag` are defined in `data/consts.json`.

### order.json schema

```json
{
  "guid": "tensura",
  "orders": {
    "recommended": [
      {
        "title": "Season 1",
        "tag": ["MAIN"],
        "start": { "episode": 1, "time": null },
        "end": { "episode": 17, "time": "12:20" },
        "remarks": "Stop when Falmuth Kingdom is introduced."
      }
    ],
    "chronological": [],
    "release": []
  }
}
```

Valid tags: `MAIN`, `OAD`, `OVA`, `Movie`, `Special`, `ONA`, `Spin-Off`, `Blu-ray`.

## Key Conventions

- **Vanilla JS only.** All JS uses IIFE wrappers with `'use strict'`.
- **BEM-ish CSS naming**: `.block__element--modifier` (e.g., `.watch-order-entry__title`, `.btn--primary`).
- **HTML escaping**: Use the `escapeHtml()` / `escapeAttr()` helpers that exist in each script file. Always escape user-facing or data-driven strings before inserting into the DOM via `innerHTML`.
- **Theme persistence**: Stored in `localStorage` under the key `aniclone_user` → `preferences.theme` (`"dark"` | `"light"` | `"auto"`). Applied via `data-color-scheme` attribute on `<html>`.
- **Progress tracking**: Per-series checkbox state stored in the `aniwatch_progress` cookie, keyed by `{guid}:{tab}`.
- **Image paths**: Data files use site-root paths (e.g., `/images/tensura.jpg`). JS resolves them to relative paths at runtime by stripping the leading `/` and prepending `../`.
- **SEO**: Each series page has Open Graph, Twitter Card, and canonical meta tags. The `tools/template.html` generates these automatically. Keep `sitemap_index.xml` and `robots.txt` in sync when adding pages.
