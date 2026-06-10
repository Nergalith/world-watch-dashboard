// ─── Fallback conflict data (used when live feed is unavailable) ───────────────

const fallbackEvents = [
  {
    title: "Red Sea corridor remains under elevated security watch",
    location: "Bab el-Mandeb",
    coords: [43.33, 12.58],
    category: "Conflict",
    severity: "High",
    summary: "The southern Red Sea remains a high-sensitivity conflict and maritime security watch area."
  },
  {
    title: "Frontline pressure reported across eastern Ukraine",
    location: "Ukraine",
    coords: [36.23, 49.99],
    category: "Conflict",
    severity: "Critical",
    summary: "Military activity keeps eastern Ukraine among the highest-priority conflict monitoring regions."
  },
  {
    title: "Israel-Gaza and regional spillover remains under watch",
    location: "Israel / Gaza",
    coords: [34.45, 31.45],
    category: "Conflict",
    severity: "Critical",
    summary: "The conflict remains a priority watch area because of civilian risk, regional escalation potential, and diplomatic pressure."
  },
  {
    title: "South China Sea pressure continues near contested waters",
    location: "South China Sea",
    coords: [114.2, 12.2],
    category: "Military",
    severity: "High",
    summary: "Patrol patterns, sovereignty disputes, and military signaling keep the region in an elevated monitoring posture."
  },
  {
    title: "Eastern Mediterranean spillover risk remains under watch",
    location: "Eastern Mediterranean",
    coords: [35.2, 33.8],
    category: "Conflict",
    severity: "High",
    summary: "Regional military activity, maritime traffic, and diplomatic pressure keep the area on the watch board."
  },
  {
    title: "Sudan conflict continues to drive regional instability",
    location: "Sudan",
    coords: [30.2, 15.7],
    category: "Conflict",
    severity: "Critical",
    summary: "Continued fighting and humanitarian pressure keep Sudan on the conflict watch board."
  },
  {
    title: "Pakistan-Afghanistan border activity remains a watch point",
    location: "Pakistan / Afghanistan",
    coords: [69.2, 33.8],
    category: "Unrest",
    severity: "High",
    summary: "Border incidents, militant activity, and state security responses keep the region relevant for daily monitoring."
  }
];

// ─── Application state ─────────────────────────────────────────────────────────

const state = {
  events: fallbackEvents.map(normalizeEvent),
  earthquakes: [], // kept for compatibility but deprioritized
  news: [],
  activeCategory: "All",
  activeNewsSource: "All",
  activeLayer: "all",           // new tactical layers
  layers: { events: true },     // legacy key kept for minimal breakage
  feedMeta: {
    generatedAt: "",
    source: ""
  },
  map: null,
  markers: [],
  selected: null
};

// ─── Utilities ─────────────────────────────────────────────────────────────────

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

function setStatus(text) {
  const el = $("#feed-status");
  if (el) el.textContent = text;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatUtc(value = "") {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(time)).replace(",", "") + " UTC";
}

// ─── Validation, normalization, ranking (fixes multiple prior review issues) ────

function isValidCoord(coords) {
  if (!Array.isArray(coords) || coords.length !== 2) return false;
  const [lng, lat] = coords.map(Number);
  return Number.isFinite(lng) && Number.isFinite(lat) &&
         lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

function severityRank(sev) {
  const s = String(sev || "").toLowerCase();
  if (s === "critical") return 3;
  if (s === "high") return 2;
  return (s === "medium" || s === "moderate") ? 1 : 0;
}

function normalizeEvent(e) {
  // Make fallbacks and live feed have identical usable shape for stats, lists, popups
  const sourceCount = Number(e.sourceCount || (e.sourceName ? 1 : 0)) || 1;
  const reportCount = Number(e.reportCount || (Array.isArray(e.reports) ? e.reports.length : 1)) || 1;
  const confidence = e.confidence || (sourceCount > 1 ? "Corroborated" : "Single Source");
  return {
    title: e.title || "Untitled signal",
    location: e.location || "Unknown",
    coords: Array.isArray(e.coords) ? e.coords : null,
    category: e.category || "Conflict",
    severity: e.severity || "High",
    summary: e.summary || "",
    sourceUrl: e.sourceUrl || "",
    seenDate: e.seenDate || "",
    sourceName: e.sourceName || "",
    sourceCount,
    reportCount,
    confidence,
    sources: Array.isArray(e.sources) ? e.sources : (e.sourceName ? [e.sourceName] : []),
    reports: Array.isArray(e.reports) ? e.reports : []
  };
}

// ─── UTC Live Clock ─────────────────────────────────────────────────────────────

function startClock() {
  const el = $("#utc-clock");
  if (!el) return;
  const pad = n => String(n).padStart(2, "0");
  const tick = () => {
    const d = new Date();
    el.textContent = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} `
      + `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
  };
  tick();
  setInterval(tick, 1000);
}

// ─── Ticker bar ────────────────────────────────────────────────────────────────

function updateTicker() {
  const signals = $("#ticker-signals");
  const quakes  = $("#ticker-quakes");
  const news    = $("#ticker-news");
  if (signals) signals.textContent = `${state.events.length} SIGNALS`;
  if (quakes)  quakes.textContent  = `${state.earthquakes.length} QUAKES`;
  if (news)    news.textContent    = `${state.news.length} NEWS ITEMS`;
}

// ─── Conflict-focused feed loading + auto refresh ──────────────────────────────

let refreshTimer = null;

async function loadLiveEvents(silent = false) {
  try {
    const res = await fetch(`data/conflict-feed.json?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Feed ${res.status}`);
    const data = await res.json();
    const raw = Array.isArray(data.events) ? data.events : [];
    // Strict validation + normalize (fixes coord bugs + fallback shape)
    const signals = raw.filter(e => isValidCoord(e.coords)).map(normalizeEvent);

    if (signals.length) {
      state.events = signals;
      state.feedMeta = {
        generatedAt: data.generatedAt || "",
        source: data.source || ""
      };
      const updated = data.generatedAt ? formatUtc(data.generatedAt) : "recently";
      setStatus(`${data.statusLabel || "OSINT feed"} • ${updated}`);
      updateLastUpdated(data.generatedAt);
    } else {
      setStatus(data.statusLabel || "Using curated conflict watch areas");
    }
  } catch (err) {
    if (!silent) setStatus("Curated conflict watch active");
    // Normalize whatever is currently in state (fallbacks)
    state.events = (state.events || []).map(normalizeEvent);
  }

  // Fix stale filter after data change (from prior review)
  const cats = categories();
  if (state.activeCategory !== "All" && !cats.includes(state.activeCategory)) {
    state.activeCategory = "All";
  }

  renderFilters();
  renderEventLists();
  renderSituationSnapshot();
  renderTopConflicts();
  renderCriticalAlerts();
  renderMapLayers();
  updateTicker();
}

function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  // ~6 min refresh gives a tactical "live" feel while staying lightweight
  refreshTimer = setInterval(() => {
    loadLiveEvents(true).then(() => {
      const panels = [$("#situation-panel"), $("#top-conflicts-panel"), $("#critical-alerts-panel")];
      panels.forEach(p => { if (p) p.classList.add("data-updated"); });
      setTimeout(() => panels.forEach(p => { if (p) p.classList.remove("data-updated"); }), 950);
    });
  }, 1000 * 60 * 6);
}

function updateLastUpdated(iso) {
  const el = $("#last-updated");
  if (!el) return;
  el.textContent = iso ? `Updated: ${formatUtc(iso)}` : "Updated: live";
}

// ─── Quakes de-emphasized / removed from primary UI (per core requirements) ────
// Stubs kept so shared app.js on events/sources doesn't explode.
async function loadEarthquakes() { /* intentionally deprioritized — conflict focus only */ }
function renderQuakeList() {}
function selectQuake() {}

// ─── News feed (hourly server-generated public RSS snapshot) ───────────────────

async function loadNewsFeed() {
  try {
    const res = await fetch(`data/news-feed.json?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`News ${res.status}`);
    const data = await res.json();
    state.news = Array.isArray(data.items) ? data.items : [];
  } catch {
    state.news = [];
  }
  renderNews();
  updateTicker();
}

function filteredNews() {
  if (state.activeNewsSource === "All") return state.news;
  return state.news.filter(item => item.source === state.activeNewsSource);
}

function renderNews() {
  const feed = $("#news-feed");
  if (!feed) return;
  const items = filteredNews().slice(0, 12);
  if (!items.length) {
    feed.innerHTML = `<div class="news-loading">No items available — feeds may be loading.</div>`;
    return;
  }
  feed.innerHTML = items.map(item => `
    <a class="news-item" href="${escapeHtml(item.link || "#")}" target="_blank" rel="noopener">
      <span class="news-source-tag">${escapeHtml(item.source)}</span>
      <span class="news-title">${escapeHtml(item.title)}</span>
      <span class="news-time">${item.publishedAt ? escapeHtml(formatUtc(item.publishedAt)) : ""}</span>
    </a>
  `).join("");
}

// ─── Conflict helpers + new tactical layers (All / Conflicts / Uprisings / Military / Critical) ──

function categories() {
  // Focused on conflict/uprising/military; Infrastructure kept only if present in data
  const preferred = ["All", "Conflict", "Military", "Unrest", "Uprisings"];
  const extras = state.events.map(e => e.category).filter(c => !preferred.includes(c));
  return [...preferred, ...new Set(extras)];
}

function visibleEvents() {
  let list = state.events;

  // Layer filtering (new tactical layers)
  const layer = state.activeLayer || "all";
  if (layer === "conflicts") {
    list = list.filter(e => (e.category || "").toLowerCase() === "conflict");
  } else if (layer === "uprisings") {
    list = list.filter(e => ["unrest", "uprising", "protest"].some(k => (e.category || "").toLowerCase().includes(k)));
  } else if (layer === "military") {
    list = list.filter(e => (e.category || "").toLowerCase() === "military");
  } else if (layer === "critical") {
    list = list.filter(e => (e.severity || "").toLowerCase() === "critical");
  }
  // "all" = no additional filter beyond category below

  if (state.activeCategory === "All") return list;
  return list.filter(e => (e.category || "") === state.activeCategory);
}

function eventTag(event) {
  return `<span class="tag">${escapeHtml(event.category)} / ${escapeHtml(event.severity)}</span>`;
}

function sourceLink(event) {
  if (!event.sourceUrl) return "";
  return `<a class="source-link" href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener">Open source</a>`;
}

function sourceLinks(event) {
  const reports = Array.isArray(event.reports) ? event.reports.filter(r => r.sourceUrl) : [];
  if (!reports.length) return sourceLink(event);
  return `
    <div class="source-stack">
      ${reports.slice(0, 4).map(r => `
        <a class="source-link" href="${escapeHtml(r.sourceUrl)}" target="_blank" rel="noopener">
          ${escapeHtml(r.sourceName || "Open source")}
        </a>
      `).join("")}
    </div>
  `;
}

function itemMeta(...items) {
  return `<div class="meta">${items.filter(Boolean).map(i => `<span>${escapeHtml(i)}</span>`).join("")}</div>`;
}

function formatDate(value = "") { return formatUtc(value); }

function signalMeta(event) {
  const sourceCount  = Number(event.sourceCount || (event.sourceName ? 1 : 0));
  const reportCount  = Number(event.reportCount || 1);
  const confidence   = event.confidence || (sourceCount > 1 ? "Corroborated" : "Single Source");
  const sourceText   = sourceCount === 1 ? "1 source" : `${sourceCount} sources`;
  const reportText   = reportCount === 1 ? "1 report" : `${reportCount} reports`;
  return itemMeta(event.category, event.severity, confidence, sourceText, reportText, formatDate(event.seenDate));
}

function reportList(event) {
  const reports = Array.isArray(event.reports) ? event.reports.filter(r => r.sourceUrl) : [];
  if (!reports.length) return "";
  return `
    <div class="report-list">
      <div class="panel-title">Top Reports</div>
      ${reports.slice(0, 4).map(r => `
        <a href="${escapeHtml(r.sourceUrl || "#")}" target="_blank" rel="noopener">
          <strong>${escapeHtml(r.title || "Open report")}</strong>
          <span>${escapeHtml(r.sourceName || "Source")}${r.seenDate ? ` / ${escapeHtml(formatDate(r.seenDate))}` : ""}</span>
        </a>
      `).join("")}
    </div>
  `;
}

// ─── Enhanced tactical sidebar renders ─────────────────────────────────────────

function renderSituationSnapshot() {
  const container = $("#situation-snapshot");
  if (!container) return;

  const events = state.events || [];
  const crit = events.filter(e => (e.severity || "").toLowerCase() === "critical").length;
  const regions = new Set(events.map(e => e.location).filter(Boolean)).size;
  const reports = events.reduce((t, e) => t + (Number(e.reportCount) || 1), 0);
  const updated = state.feedMeta.generatedAt ? formatUtc(state.feedMeta.generatedAt) : "—";

  container.innerHTML = `
    <div class="snapshot-item critical">
      <strong>${crit}</strong>
      <span class="label">Critical Hotspots</span>
    </div>
    <div class="snapshot-item">
      <strong>${events.length}</strong>
      <span class="label">Active Signals</span>
    </div>
    <div class="snapshot-item">
      <strong>${regions}</strong>
      <span class="label">Regions Watched</span>
    </div>
    <div class="snapshot-item">
      <strong>${reports}</strong>
      <span class="label">Source Reports</span>
    </div>
    <div class="snapshot-item updated">
      <span>Last OSINT update: <strong>${escapeHtml(updated)}</strong></span>
    </div>
  `;
}

function renderTopConflicts() {
  const container = $("#top-conflicts");
  if (!container) return;

  const sorted = [...(state.events || [])]
    .sort((a, b) => {
      const sev = severityRank(b.severity) - severityRank(a.severity);
      if (sev) return sev;
      return (Number(b.reportCount) || 0) - (Number(a.reportCount) || 0);
    })
    .slice(0, 7);

  if (!sorted.length) {
    container.innerHTML = `<div class="list-item"><span class="meta">No active signals</span></div>`;
    return;
  }

  container.innerHTML = sorted.map((ev, idx) => {
    const sevClass = (ev.severity || "").toLowerCase();
    return `
      <div class="top-item ${sevClass}" data-event-index="${state.events.indexOf(ev)}">
        <span class="sev">${escapeHtml(ev.severity || "—")}</span>
        <div>
          <div class="title">${escapeHtml(ev.title)}</div>
          <div class="meta">${escapeHtml(ev.location)}</div>
        </div>
        <div class="meta">${Number(ev.reportCount) || 1} reports</div>
      </div>
    `;
  }).join("");
}

function renderCriticalAlerts() {
  const container = $("#critical-alerts");
  if (!container) return;

  const critical = (state.events || [])
    .filter(e => (e.severity || "").toLowerCase() === "critical")
    .slice(0, 5);

  if (!critical.length) {
    container.innerHTML = `<div class="alert-item"><span class="meta">No critical alerts at this time.</span></div>`;
    return;
  }

  container.innerHTML = critical.map(ev => `
    <div class="alert-item" data-event-index="${state.events.indexOf(ev)}">
      <div class="title">${escapeHtml(ev.title)}</div>
      <div class="meta">${escapeHtml(ev.location)} · ${escapeHtml(ev.seenDate ? formatUtc(ev.seenDate) : "")}</div>
    </div>
  `).join("");
}

function renderStats() {
  // Legacy support for any remaining stat grids (kept lightweight)
  const stats = $("#signal-stats");
  if (!stats) return;
  const events = state.events || [];
  const crit = events.filter(e => (e.severity || "").toLowerCase() === "critical").length;
  const reports = events.reduce((t, e) => t + (Number(e.reportCount) || 1), 0);
  const updated = state.feedMeta.generatedAt ? formatDate(state.feedMeta.generatedAt) : "—";

  stats.innerHTML = [
    ["Signals", events.length],
    ["Critical", crit],
    ["Reports", reports],
    ["Updated", updated]
  ].map(([label, value]) => `
    <div class="stat-item">
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `).join("");
}

// ─── Event lists (used by both map sidebar and events page) ────────────────────

function renderEventLists() {
  const compact = $("#event-list");
  if (compact) {
    compact.innerHTML = visibleEvents().slice(0, 6).map((event, index) => {
      const realIdx = state.events.indexOf(event);
      return `
        <article class="list-item" data-event-index="${realIdx}">
          ${itemMeta(
            event.severity,
            event.confidence || "Signal",
            event.sourceCount > 1 ? `${event.sourceCount} sources` : "Single source"
          )}
          <h3>${escapeHtml(event.title)}</h3>
          <span class="tag">${escapeHtml(event.location)}</span>
        </article>
      `;
    }).join("");
  }

  const grid = $("#event-grid");
  if (grid) {
    grid.innerHTML = visibleEvents().map(event => {
      const realIdx = state.events.indexOf(event);
      const sevClass = (event.severity || "").toLowerCase();
      return `
        <article class="event-card ${sevClass}" data-event-index="${realIdx}">
          ${eventTag(event)}
          <h2>${escapeHtml(event.title)}</h2>
          <p>${escapeHtml(event.summary)}</p>
          ${sourceLinks(event)}
          ${signalMeta(event)}
          <div class="event-meta">
            <span class="tag">${escapeHtml(event.location)}</span>
            ${event.reportCount ? `<span class="meta-count">${event.reportCount} reports</span>` : ''}
          </div>
        </article>
      `;
    }).join("");
  }
}

function renderFilters() {
  const filterRow = $("#event-filters");
  if (!filterRow) return;
  filterRow.innerHTML = categories().map(cat => `
    <button class="${cat === state.activeCategory ? "active" : ""}" data-category="${cat}" type="button">
      ${cat}
    </button>
  `).join("");
}

// Update ticker (no more quakes)
function updateTicker() {
  const signals = $("#ticker-signals");
  const crit    = $("#ticker-critical");
  const news    = $("#ticker-news");
  const events = state.events || [];
  if (signals) signals.textContent = `${events.length} HOTSPOTS`;
  if (crit)    crit.textContent    = `${events.filter(e => (e.severity||"").toLowerCase()==="critical").length} CRITICAL`;
  if (news)    news.textContent    = `${state.news.length} NEWS`;
}

// ─── Map (with rich popups + improved markers for conflict focus) ──────────────

function createMap() {
  const mapNode = $("#world-map");
  if (!mapNode || typeof maplibregl === "undefined") return;

  // Primary: Carto Dark Matter GL (recommended for stable dark tactical OSINT dashboards)
  // Fallback: demotiles for reliability if primary tiles fail.
  const primaryStyle = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
  const fallbackStyle = "https://demotiles.maplibre.org/style.json";
  let mapLoadAttempts = 0;
  const MAX_ATTEMPTS = 2;

  state.map = new maplibregl.Map({
    container: "world-map",
    style: primaryStyle,
    center: [10, 18],   // good global tactical view (centered slightly on Europe/Africa/ME)
    zoom: 1.55,
    pitch: 0,
    bearing: 0,
    attributionControl: true
  });

  // Better error handling + retry logic for tile load failures
  state.map.on('error', (e) => {
    console.error('MapLibre error:', e && (e.error || e));
    mapLoadAttempts++;

    // Remove any previous error notice
    const existingNotice = mapNode.querySelector('.map-error');
    if (existingNotice) existingNotice.remove();

    if (mapLoadAttempts < MAX_ATTEMPTS) {
      // Retry with fallback style after short delay
      console.warn(`Map tile load failed (attempt ${mapLoadAttempts}), retrying with fallback style...`);
      setTimeout(() => {
        if (state.map) {
          try {
            state.map.setStyle(fallbackStyle);
            // Re-apply label hiding and resize after style change
            state.map.once('load', () => {
              if (state.map) state.map.resize();
              applyLabelHiding();
            });
          } catch (err) {
            console.error('Failed to set fallback style:', err);
          }
        }
      }, 1500);
    } else {
      // Final failure: show persistent but non-blocking notice
      if (mapNode && !mapNode.querySelector('.map-error')) {
        const notice = document.createElement('div');
        notice.className = 'map-error';
        notice.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);color:#f88;font-size:12px;text-align:center;padding:16px;z-index:3;pointer-events:none;';
        notice.innerHTML = 'Basemap tiles failed to load after retries.<br>Using offline fallback or check network/adblocker.';
        mapNode.appendChild(notice);
      }
    }
  });

  state.map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");

  // Robust resize handling (grid layouts + window resizes often need this)
  const doResize = () => { if (state.map) state.map.resize(); };

  state.map.on("load", () => {
    renderMapLayers();
    // Explicit resize inside load handler (critical for MapLibre + dynamic flex/grid layouts)
    if (state.map) state.map.resize();
    doResize();
    // extra safety after layout settles
    setTimeout(doResize, 180);
    setTimeout(doResize, 500);

    // Clear any previous tile error notice on successful load
    const errNotice = mapNode.querySelector('.map-error');
    if (errNotice) errNotice.remove();

    applyLabelHiding();
  });

  // Helper to reduce dense geographic labels that can appear "repeated" or cluttered
  function applyLabelHiding() {
    if (!state.map) return;
    const labelLayersToHide = [
      'country-label', 'state-label', 'place-label', 'road-label',
      'ocean-label', 'water-label', 'Tropic of Cancer', 'Equator'
    ];
    labelLayersToHide.forEach(id => {
      try {
        if (state.map.getLayer(id)) {
          state.map.setLayoutProperty(id, 'visibility', 'none');
        }
      } catch (e) { /* layer not present in this style */ }
    });
  }

  // Observe container size changes (very helpful after the tactical UI grid changes)
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(doResize);
    ro.observe(mapNode);
  }

  // Fallback for window resize
  window.addEventListener('resize', doResize, { passive: true });

  // Immediate attempt (helps when grid computes height after first paint)
  setTimeout(doResize, 80);
}

function clearMarkers() {
  state.markers.forEach(m => { try { m.remove(); } catch (_) {} });
  state.markers = [];
}

function addMarker(item, className, label, onClick) {
  if (!isValidCoord(item.coords)) return;

  const el = document.createElement("button");
  const sev = String(item.severity || "").toLowerCase();
  const conf = String(item.confidence || "").toLowerCase().replace(/\s+/g, "-");
  const cat = String(item.category || "").toLowerCase();

  let markerClass = `${className} marker-${sev} marker-${conf}`;
  if (cat.includes("military")) markerClass += " marker-military";
  if (cat.includes("unrest") || cat.includes("uprising")) markerClass += " marker-uprising";

  el.className = markerClass.trim();
  el.type = "button";
  el.textContent = (item.sourceCount && item.sourceCount > 1) ? String(item.sourceCount) : (label || "!");
  el.title = `${item.location} — ${item.severity}`;

  // Rich popup on click (in addition to side panel)
  el.addEventListener("click", (ev) => {
    if (onClick) onClick(ev);
    if (state.map) {
      new maplibregl.Popup({ closeButton: true, closeOnClick: true })
        .setLngLat(item.coords)
        .setHTML(`
          <div>
            <h3>${escapeHtml(item.severity)} — ${escapeHtml(item.location)}</h3>
            <div style="margin:4px 0 6px;font-size:11px;">${escapeHtml(item.title)}</div>
            <div style="font-size:10px;color:#9aa4b8;margin-bottom:6px;">${escapeHtml(item.summary || "")}</div>
            ${item.sourceUrl ? `<a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener">View source →</a>` : ""}
            <div style="margin-top:6px;font-size:9px;opacity:.75;">${escapeHtml(item.confidence || "")} • ${item.reportCount || 1} report(s)</div>
          </div>
        `)
        .addTo(state.map);
    }
  });

  const marker = new maplibregl.Marker({ element: el }).setLngLat(item.coords).addTo(state.map);
  state.markers.push(marker);
}

function renderMapLayers() {
  if (!state.map) return;
  clearMarkers();

  const toShow = visibleEvents();
  toShow.forEach(event => {
    addMarker(event, "marker-event", "!", () => selectEvent(event));
  });
}

function selectEvent(event) {
  if (!event || !isValidCoord(event.coords)) return;
  state.selected = event;

  const panel = $("#selected-panel");
  if (panel) {
    panel.innerHTML = `
      ${eventTag(event)}
      <h2>${escapeHtml(event.title)}</h2>
      <p>${escapeHtml(event.summary)}</p>
      ${sourceLinks(event)}
      ${signalMeta(event)}
      ${reportList(event)}
      <div style="margin-top:8px;font-size:10px;color:var(--muted);">${escapeHtml(event.seenDate ? formatUtc(event.seenDate) : "")}</div>
    `;
  }
  if (state.map) {
    state.map.flyTo({ center: event.coords, zoom: 4.2, speed: 0.85 });
  }
}

// ─── Controls (new layers + new sidebar lists + news) ──────────────────────────

function wireControls() {
  document.addEventListener("click", event => {
    // Category (All / Conflict / Military / Unrest ...)
    const filter = event.target.closest("[data-category]");
    if (filter) {
      state.activeCategory = filter.dataset.category;
      renderFilters();
      renderEventLists();
      renderMapLayers();
      renderTopConflicts();
      renderCriticalAlerts();
      return;
    }

    // New tactical layer toggles
    const layerBtn = event.target.closest("[data-layer]");
    if (layerBtn) {
      const key = layerBtn.dataset.layer;
      // Deactivate siblings
      $$(".layer-bank .layer-toggle").forEach(b => b.classList.remove("active"));
      layerBtn.classList.add("active");

      state.activeLayer = key;
      renderMapLayers();
      renderEventLists();
      renderTopConflicts();
      renderCriticalAlerts();
      return;
    }

    // Click in compact event list or top/alerts → select
    const evItem = event.target.closest("[data-event-index]");
    if (evItem) {
      const idx = Number(evItem.dataset.eventIndex);
      const item = state.events[idx];
      if (item) selectEvent(item);
      return;
    }

    // News tabs
    const newsTab = event.target.closest("#news-tabs [data-source]");
    if (newsTab) {
      state.activeNewsSource = newsTab.dataset.source;
      $$("#news-tabs button").forEach(btn => btn.classList.toggle("active", btn.dataset.source === state.activeNewsSource));
      renderNews();
    }
  });

  // Also allow clicking the whole top-item / alert for selection (delegation above covers it)
}

// ─── Init (conflict focus + auto refresh + initial renders) ────────────────────

async function init() {
  startClock();
  wireControls();
  renderFilters();
  renderEventLists();
  renderSituationSnapshot();
  renderTopConflicts();
  renderCriticalAlerts();
  renderStats();
  createMap();

  await loadLiveEvents();
  renderSituationSnapshot();
  renderTopConflicts();
  renderCriticalAlerts();
  renderMapLayers();
  updateTicker();

  // Start auto-refresh for live tactical feel
  startAutoRefresh();

  // News (non-blocking)
  loadNewsFeed();
}

init();
