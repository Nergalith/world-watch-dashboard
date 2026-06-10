## Summary

world-watch-dashboard is a small standalone static multi-page public OSINT site (index + events + sources) that renders live conflict signals (aggregated from GDELT + RSS via scheduled Node updater), USGS M4.5+ earthquakes, and filtered news headlines on a MapLibre GL interactive map plus vanilla-JS lists/tabs/stats. The implementation correctly separates updater (Node fetch + regex XML + region keyword scoring + grouping/deduping/confidence) from client (cache-busted JSON fetch with embedded fallback, event-delegated controls, escaped innerHTML renders, layer toggles), uses no frameworks or secrets, and provides graceful degradation. Strengths: consistent HTML escaping, per-source try/catch isolation in the mjs script, safe external links with rel=noopener, semantic HTML, and pure-CSS dark/responsive design. Dominant risks: minimal coord/field validation, duplicated magic data (fallbacks + category logic) between app.js and the updater, crude regex-based RSS parsing without schema validation, inconsistent cache-busting/versioning on shared app.js, bare catch blocks that hide partial-failure details, and the 550-line app.js monolith with repeated render + state mutation patterns.

## Issues

### Issue 1 -- Severity: bug
- File: app.js:148
- Description: Live feed ingestion does only `Array.isArray(e.coords)` filtering before assigning to state.events; no length, numeric, or range validation on the coordinate pair. Malformed or swapped coords from upstream (or corrupted data/conflict-feed.json) will be passed directly to maplibregl.Marker.setLngLat and map.flyTo, producing off-map markers, NaN positions, or runtime errors in the map library.
- Suggestion: Add a guard `e.coords.length === 2 && e.coords.every(c => Number.isFinite(Number(c)))` (and optionally clamp to [-180,180]/[-90,90]) before accepting a signal; log or drop invalid items with a distinct status message.
- Status: open

### Issue 2 -- Severity: bug
- File: app.js:3
- File: app.js:65
- File: app.js:337
- Description: renderStats (and initial state) operate on fallbackEvents which contain only title/location/coords/category/severity/summary; the code nevertheless does `e.confidence`, `Array.isArray(e.sources)`, `e.sourceName`, `e.reportCount` etc. Result: highSignals always 0, sources Set size often 1 or 0, and "High Signal" stat is meaningless while the curated fallback is active (before or on fetch failure).
- Suggestion: Make fallbackEvents carry the same shape as grouped live events (sourceCount, reportCount, confidence, sources:[], reports:[]), or normalize inside renderStats / signalMeta with the same defaults already present in those helpers.
- Status: open

### Issue 3 -- Severity: bug
- File: index.html:123
- File: events.html:39
- Description: `<script src="app.js">` lacks the `?v=20260526-opsdesk` cache-buster that index.html and all three pages' styles.css links use. Any update to app.js will be invisible to visitors who previously loaded events.html (or any direct link) until they hard-refresh.
- Suggestion: Add the identical version query param to the script tag in events.html (and any future pages); consider extracting the version to a single constant or build step.
- Status: open

### Issue 4 -- Severity: bug
- File: scripts/update-conflict-feed.mjs:24
- File: app.js:3
- Description: fallbackEvents arrays are duplicated (different lengths: 10 vs 7, different titles/summaries/locations, and mjs version includes source* fields). When the updater falls back it writes one set; a client that cannot fetch the JSON keeps the other set. The two code paths can show inconsistent signals for the same "live feed unavailable" condition.
- Suggestion: Move the canonical fallback list into data/ (or a shared JSON) and have both the mjs (for write) and app.js (for embedded) consume it; or generate the client fallback from the same source at build time.
- Status: open

### Issue 5 -- Severity: bug
- File: app.js:404
- File: app.js:437
- File: app.js:448
- File: app.js:476
- File: app.js:224
- Description: No defensive check that item.coords / quake.coords is a valid [lng, lat] pair before new maplibregl.Marker(...).setLngLat(...) or flyTo. Combined with the weak filter at line 148 and USGS path that only checks Array.isArray on the raw geometry array, bad data reaches the map library.
- Suggestion: Centralize a isValidCoord(c) helper used by loadLiveEvents, loadEarthquakes, addMarker, addQuakeMarker, select*, and renderMapLayers; drop or skip markers with invalid coords and surface a one-time console/status warning.
- Status: open

### Issue 6 -- Severity: bug
- File: scripts/update-conflict-feed.mjs:224
- File: scripts/update-conflict-feed.mjs:235
- File: scripts/update-conflict-feed.mjs:217
- Description: RSS/XML consumption relies on two large /<item\b[\s\S]*?<\/item>/gi regexes plus per-tag xmlTag regex (with manual CDATA strip and limited decodeEntities). Malformed, namespace'd, or very large feeds, CDATA with embedded tags, or encoding edge cases can silently drop items for an entire source without any structured error beyond the generic catch that only console.errors the HTTP status.
- Suggestion: Add a small tolerant RSS parser (or at least wrap the matchAll results in try and count "parsed X of Y items"); consider falling back to a text-only extraction or at minimum logging how many items were lost per source.
- Status: open

### Issue 7 -- Severity: bug
- File: app.js:158
- File: app.js:192
- File: app.js:235
- File: scripts/update-conflict-feed.mjs:435
- File: scripts/update-conflict-feed.mjs:446
- File: scripts/update-conflict-feed.mjs:494
- Description: All fetch error paths are bare `catch { ... }` or `catch (error) { console.error(...) }`. Network failures, JSON parse errors, schema shape errors, CORS, and timeout are indistinguishable; the only observable is a generic status pill or a console line. Partial success (e.g. GDELT succeeded but both RSS failed) is not surfaced distinctly to operators or users.
- Suggestion: Distinguish network vs parse vs "0 items after region filter", include the error.message or status in the final feed statusLabel / feedMeta, and have the client surface the source list + last error summary when using fallback.
- Status: open

### Issue 8 -- Severity: bug
- File: app.js:487
- File: app.js:267
- File: app.js:273
- Description: Category filter state (activeCategory) is never reset when loadLiveEvents replaces state.events. If a user selects e.g. "Infrastructure" (present in current feed) and the next scheduled data drop contains no events of that category, visibleEvents() returns [], the filter buttons are re-rendered without an "active" one for the stale value, and the lists go empty until the user clicks "All".
- Suggestion: After a successful live load (or on any state.events replacement), if (!categories().includes(state.activeCategory)) state.activeCategory = "All"; then re-render.
- Status: open

### Issue 9 -- Severity: suggestion
- File: app.js:531
- File: events.html:39
- File: sources.html:0
- Description: Every page loads the full 550-line app.js (and therefore performs the three data/ fetches plus USGS + maplibre conditional). sources.html is purely static content yet still executes init(), startClock (no-op), wireControls (no-op), loadLiveEvents (only updates a non-existent status pill), loadEarthquakes and loadNewsFeed.
- Suggestion: Split app.js into a core shared module (state, utils, renderers used by index/events) and page-specific bootstraps, or use dynamic import on index.html only for the map+live bits; at minimum guard the news/eq/map paths behind element existence earlier.
- Status: open

### Issue 10 -- Severity: suggestion
- File: app.js:267
- File: scripts/update-conflict-feed.mjs:160
- File: scripts/update-conflict-feed.mjs:168
- Description: Category names ("Conflict", "Military", "Unrest", "Infrastructure"), severity strings, confidence values, and the preferred list are duplicated as magic strings and regexes across the client and the updater. Adding a new category or changing a keyword requires edits in two places plus HTML tab markup.
- Suggestion: Extract a single shared constants module (or JSON) consumed by both the mjs script and app.js; regenerate the news tabs and filter buttons from the same list.
- Status: open

### Issue 11 -- Severity: suggestion
- File: app.js:203
- File: app.js:217
- File: app.js:252
- File: app.js:255
- File: app.js:343
- File: app.js:363
- File: app.js:378
- File: app.js:393
- File: app.js:467
- Description: All dynamic content (lists, panels, stats, news, selected) is built via repeated innerHTML = `...` template literals after escapeHtml on leaf values. While escaping is thorough, the pattern forces full DOM replacement on every filter/layer/load, repeats nearly identical card structures, and makes future a11y or micro-interaction changes verbose.
- Suggestion: Introduce tiny DOM helpers (createEl, append) or a <template> + cloneNode approach for the repeated list-item / event-card / source-link fragments; keep escapeHtml for text nodes/attrs.
- Status: open

### Issue 12 -- Severity: suggestion
- File: index.html:8
- File: index.html:10
- File: index.html:12
- Description: maplibre-gl@5.7.3 CSS and JS plus basemaps.cartocdn are loaded from unpkg / cartocdn with no integrity hashes or CSP. A compromised CDN could inject code or styles into the dashboard.
- Suggestion: Add SRI (subresource integrity) hashes for the two maplibre resources (update when bumping version); consider a minimal meta CSP that at least restricts script-src to 'self' + the known CDNs.
- Status: open

### Issue 13 -- Severity: suggestion
- File: app.js:119
- File: app.js:404
- File: styles.css:219
- Description: Map container resize is handled only by a one-time 250 ms setTimeout after the 'load' event and an explicit call inside the initial createMap. Container size changes (mobile orientation, sidebar collapse, late CSS load) can leave the map partially rendered or with incorrect attribution placement.
- Suggestion: Add a ResizeObserver on the map container (or listen to window resize + map.resize) and call state.map.resize() when the dashboard shell changes size; also ensure initial fitBounds runs after fonts/CSS are stable.
- Status: open

### Issue 14 -- Severity: nit
- File: index.html:19
- File: events.html:13
- File: sources.html:13
- Description: Brand logo <img> has empty alt="" (decorative) and no aria-hidden, while the wrapping <a> provides aria-label. Screen readers will announce the link text but the image itself contributes nothing; inconsistent with the "Nergalith" text that follows.
- Suggestion: Add aria-hidden="true" to the three logo imgs for clarity, or provide a meaningful alt if the image is considered content on any page.
- Status: open

### Issue 15 -- Severity: nit
- File: app.js:85
- File: app.js:86
- File: styles.css:27
- Description: Heavy reliance on global $ / $$ helpers and repeated document.querySelector inside almost every render and wire function; combined with the single 550-line file and many inline template literals this makes the client runtime harder to reason about or test than necessary for a "small" dashboard.
- Suggestion: At minimum add JSDoc or a small comment block per section; consider extracting the pure renderers (itemMeta, signalMeta, eventTag, ...) into a separate ui.js if the file grows further.
- Status: open

### Issue 16 -- Severity: nit
- File: scripts/update-conflict-feed.mjs:250
- File: scripts/update-conflict-feed.mjs:271
- File: .github/workflows/update-conflict-feed.yml:6
- Description: The news relevance regex and GDELT query terms are broad and contain overlapping tokens; the hourly cron (":17") plus no per-request timeout or User-Agent rotation means a slow or rate-limited upstream can stall the entire workflow for the hour with only console.error output.
- Suggestion: Add AbortSignal/timeout wrappers around the three fetchRss* and fetchGdelt calls; consider making the cron slightly sparser or adding a workflow timeout; surface "partial: GDELT failed" in the written statusLabel.
- Status: open
