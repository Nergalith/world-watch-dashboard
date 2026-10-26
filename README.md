# Nergalith World Watch

**Public OSINT aggregator for active conflicts, uprisings, military hotspots, and critical geopolitical events.**

Lightweight, static-friendly multi-page dashboard designed to be hosted standalone or embedded. Emphasizes open-source collection only — we do not generate or claim proprietary intelligence.

## Pages

- `index.html` — Tactical operational map (primary World Watch view)
- `events.html` — Full conflict & geopolitical signal feed + filters
- `sources.html` — Sources, method, and prominent public OSINT disclaimer

## Core Focus (updated 2026-06)

- Conflicts, uprisings/protests, military hotspots, and high-severity geopolitical events only
- Natural disasters / earthquakes deprioritized or removed unless directly tied to conflict zones
- Prominent disclaimer on every view: aggregates public OSINT only

## Live Public Feeds

- `data/conflict-feed.json` + `data/news-feed.json` — refreshed on schedule by GitHub Actions
- GDELT (Article List, conflict/military terms, last 7 days)
- UN News Peace & Security RSS + International Crisis Group RSS
- Curated high-priority regional fallback when live sources are unavailable

## Features (current)

- Interactive MapLibre map with severity- and category-aware markers + rich popups
- Toggleable tactical layers: All / Active Conflicts / Uprisings / Military Hotspots / Critical Areas
- Right sidebar: Situation Snapshot (live counters), Top Conflicts (severity + volume ranked), Critical Alerts
- Auto-refreshing feeds (~6 min) with subtle update flashes
- Strong Live Public News strip with source tabs
- Prominent timestamps, last-updated, and full source attribution on every item
- Clean Nergalith branding + Map / Events / Sources navigation
- Fully static + fast (vanilla JS + CDN MapLibre, no build step)

## Country View

The map shades every country by how much **conflict reporting** it is getting (Red / Orange / Yellow / Green, grey = no recent reports). Hover for the name and level; click for a panel with severity, trend, counts and the last 7 days of headlines with links to the original stories.

- **Tagging** (`scripts/country-view.mjs`): each headline is tagged with the countries it names (names, nationality words, major cities/regions such as Karachi or Balochistan -> Pakistan, Gaza -> Palestine). Ambiguous names (Georgia, Jordan, Chad, Turkey) are only matched when the text does not point elsewhere. A headline is a conflict report if it contains armed-conflict keywords.
- **Window**: `data/country-items.json` keeps a rolling 30-day window (deduped by URL and title, capped at 8,000 items). The page loads only the smaller summary `data/country-feed.json`.
- **Severity**: conflict reports per day = conflict reports in the window / min(30, days collected + 7). Red >= 4, Orange >= 1.5, Yellow >= 0.3, otherwise Green. Countries never named stay grey ("No recent reports"), not green.
- **Trend**: last 7 days vs the previous 7 days (escalating if at least 1.5x and 3 more; cooling if the reverse; otherwise steady). Shows "not enough data" until 14 days have been collected or when counts are small.
- **Honesty**: severity reflects reporting volume, not casualties or territory. It is keyword counting, so it is biased towards countries with more English-language coverage or with their own outlets in the source list.
- **Sources**: the conflict and news feeds above plus Dawn, Express Tribune, Geo News, The News (Pakistan), BBC Asia/Europe/Latin America, The Hindu, Africanews, AllAfrica, The Guardian, France 24 and RFI. Borders: Natural Earth 1:110m (public domain), simplified in `data/countries.geojson`.
- **Tests**: `node scripts/test-country-view.mjs`.

## Refresh Workflow (unchanged)

- `.github/workflows/update-conflict-feed.yml` (cron + git-auto-commit)
- `scripts/update-conflict-feed.mjs` (GDELT + RSS parsing, region grouping, deduping, confidence, fallbacks)

## Philosophy

This is a public information aggregator. All data links back to original publishers. Always verify with primary sources. Not emergency guidance or classified intelligence.
