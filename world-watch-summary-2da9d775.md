# Review Summary

- **Mode**: local (full project review)
- **Target**: world-watch-dashboard at C:\Users\VICTUS\Documents\GitHub\world-watch-dashboard (clean main branch, all committed source)
- **Files reviewed**: 9 (index.html, events.html, sources.html, app.js, styles.css, scripts/update-conflict-feed.mjs, .github/workflows/update-conflict-feed.yml, README.md, data/*.json samples)
- **Diff stats**: N/A — full static analysis of the entire codebase (no uncommitted changes; git status clean on main)
- **Issue counts**: 8 bugs, 5 suggestions, 3 nits

## Top issues

- [bug] app.js:148 -- Live feed ingestion does only Array.isArray(e.coords) filtering; no numeric/range validation on coords before Marker.setLngLat / flyTo
- [bug] app.js:3,65,337 -- renderStats and fallbackEvents lack the live event shape fields (confidence, sources, reportCount); stats are wrong or zero on fallback
- [bug] index.html:123, events.html:39 -- app.js script tag missing the ?v= cache-buster used by CSS and on index; updates invisible on secondary pages
- [bug] scripts/update-conflict-feed.mjs:24 + app.js:3 -- Two different fallbackEvents arrays (different content/length/fields) in updater vs client
- [bug] app.js:404 + multiple -- No isValidCoord guard before any maplibregl.Marker or flyTo (USGS + live paths)

See the full review at: world-watch-review-2da9d775.md (or C:\Users\VICTUS\Documents\GitHub\world-watch-dashboard\world-watch-review-2da9d775.md)

The reviewer subagent (ID 019eb207-5303-7082-b965-58998eb69334) performed the analysis read-only using list_dir/read_file/grep from the project cwd and wrote only the review artifact.
