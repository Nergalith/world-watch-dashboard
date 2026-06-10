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

## Refresh Workflow (unchanged)

- `.github/workflows/update-conflict-feed.yml` (cron + git-auto-commit)
- `scripts/update-conflict-feed.mjs` (GDELT + RSS parsing, region grouping, deduping, confidence, fallbacks)

## Philosophy

This is a public information aggregator. All data links back to original publishers. Always verify with primary sources. Not emergency guidance or classified intelligence.
