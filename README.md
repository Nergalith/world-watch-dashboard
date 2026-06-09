# World Conflict Tracking

Nergalith World Conflict Tracking is a small multi-page public awareness dashboard. It is designed to be hosted as a standalone static site and linked or embedded from the main Nergalith website.

Pages:

- `index.html` - conflict map overview
- `events.html` - current conflict signal board
- `sources.html` - source notes and public-data disclaimer

Current live public feed:

- `data/conflict-feed.json`, refreshed hourly by GitHub Actions
- GDELT public article signals for the latest seven days when available
- UN News Peace and Security RSS
- International Crisis Group RSS
- curated conflict fallback events when public feeds are unavailable

Current public context layers:

- clickable conflict map markers
- curated conflict fallback events
- conflict, military, unrest, and infrastructure filters

Refresh workflow:

- `.github/workflows/update-conflict-feed.yml`
- `scripts/update-conflict-feed.mjs`

Future public layers:

- government advisories
- humanitarian updates
- sanctions notices
- verified regional monitors