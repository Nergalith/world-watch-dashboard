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
  events: fallbackEvents,
  earthquakes: [],
  news: [],
  activeCategory: "All",
  activeNewsSource: "All",
  layers: {
    events: true,
    earthquakes: false
  },
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

// ─── Conflict feed ─────────────────────────────────────────────────────────────

async function loadLiveEvents() {
  try {
    const res = await fetch(`data/conflict-feed.json?v=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Feed ${res.status}`);
    const data = await res.json();
    const signals = Array.isArray(data.events) ? data.events.filter(e => Array.isArray(e.coords)) : [];
    if (signals.length) {
      state.events = signals;
      state.feedMeta = {
        generatedAt: data.generatedAt || "",
        source: data.source || ""
      };
      const updated = data.generatedAt ? formatUtc(data.generatedAt) : "recently";
      setStatus(`${data.statusLabel || "Conflict feed"} updated ${updated}`);
    }
  } catch {
    setStatus("Curated conflict feed active");
  }
}

// ─── USGS Earthquakes (free, no key required) ──────────────────────────────────

async function loadEarthquakes() {
  try {
    const res = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson"
    );
    if (!res.ok) throw new Error("USGS unavailable");
    const data = await res.json();
    state.earthquakes = (data.features || [])
      .filter(f => f.geometry && Array.isArray(f.geometry.coordinates))
      .map(f => ({
        title:     f.properties.place || "Unknown location",
        coords:    [f.geometry.coordinates[0], f.geometry.coordinates[1]],
        magnitude: f.properties.mag,
        depth:     Math.round(f.geometry.coordinates[2]),
        time:      new Date(f.properties.time).toISOString(),
        url:       f.properties.url,
        category:  "Earthquake",
        severity:  f.properties.mag >= 6.5 ? "Critical"
                 : f.properties.mag >= 5.5 ? "High"
                 : "Medium"
      }))
      .sort((a, b) => b.magnitude - a.magnitude)
      .slice(0, 60);

    renderQuakeList();
    updateTicker();
    if (state.layers.earthquakes) renderMapLayers();
  } catch {
    console.warn("Earthquake feed unavailable");
  }
}

function renderQuakeList() {
  const list  = $("#quake-list");
  const badge = $("#quake-badge");
  if (!list) return;
  if (badge) badge.textContent = `${state.earthquakes.length} active`;

  list.innerHTML = state.earthquakes.slice(0, 6).map((q, i) => `
    <article class="list-item" data-quake-index="${i}">
      <div class="meta">
        <span class="mag-badge mag-${escapeHtml(q.severity.toLowerCase())}">M${Number(q.magnitude).toFixed(1)}</span>
        <span>${escapeHtml(formatUtc(q.time))}</span>
      </div>
      <h3>${escapeHtml(q.title)}</h3>
    </article>
  `).join("");
}

function selectQuake(quake) {
  const panel = $("#selected-panel");
  if (panel) {
    panel.innerHTML = `
      <span class="tag">Earthquake</span>
      <h2>M${Number(quake.magnitude).toFixed(1)} — ${escapeHtml(quake.title)}</h2>
      <p>Depth: ${escapeHtml(String(quake.depth))} km · ${escapeHtml(formatUtc(quake.time))}</p>
      ${quake.url ? `<a class="source-link" href="${escapeHtml(quake.url)}" target="_blank" rel="noopener">USGS Report →</a>` : ""}
    `;
  }
  if (state.map) state.map.flyTo({ center: quake.coords, zoom: 5, speed: 0.8 });
}

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

// ─── Conflict helpers (unchanged) ─────────────────────────────────────────────

function categories() {
  const preferred = ["All", "Conflict", "Military", "Unrest", "Infrastructure"];
  const extras = state.events.map(e => e.category).filter(c => !preferred.includes(c));
  return [...preferred, ...new Set(extras)];
}

function visibleEvents() {
  if (state.activeCategory === "All") return state.events;
  return state.events.filter(e => e.category === state.activeCategory);
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

// ─── Stats panel ───────────────────────────────────────────────────────────────

function renderStats() {
  const stats = $("#signal-stats");
  if (!stats) return;
  const events     = state.events;
  const highSignals = events.filter(e => ["High Signal", "Corroborated"].includes(e.confidence)).length;
  const sources    = new Set(events.flatMap(e => Array.isArray(e.sources) ? e.sources : [e.sourceName]).filter(Boolean));
  const reports    = events.reduce((t, e) => t + Number(e.reportCount || 1), 0);
  const updated    = state.feedMeta.generatedAt ? formatDate(state.feedMeta.generatedAt) : "Pending";
  const critCount  = events.filter(e => e.severity === "Critical").length;

  stats.innerHTML = [
    ["Signals",     events.length],
    ["Critical",    critCount],
    ["Reports",     reports],
    ["Sources",     sources.size || 1],
    ["High Signal", highSignals],
    ["Updated",     updated]
  ].map(([label, value]) => `
    <div class="stat-item">
      <strong>${escapeHtml(String(value))}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `).join("");
}

// ─── Event lists ───────────────────────────────────────────────────────────────

function renderEventLists() {
  const compact = $("#event-list");
  if (compact) {
    compact.innerHTML = visibleEvents().slice(0, 6).map((event, index) => `
      <article class="list-item" data-event-index="${index}">
        ${itemMeta(
          event.severity,
          event.confidence || "Signal",
          event.sourceCount === 1 ? "1 source" : event.sourceCount ? `${event.sourceCount} sources` : event.sourceName
        )}
        <h3>${escapeHtml(event.title)}</h3>
        <span class="tag">${escapeHtml(event.location)}</span>
      </article>
    `).join("");
  }

  const grid = $("#event-grid");
  if (grid) {
    grid.innerHTML = visibleEvents().map(event => `
      <article class="event-card">
        ${eventTag(event)}
        <h2>${escapeHtml(event.title)}</h2>
        <p>${escapeHtml(event.summary)}</p>
        ${sourceLinks(event)}
        ${signalMeta(event)}
      </article>
    `).join("");
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

// ─── Map ───────────────────────────────────────────────────────────────────────

function createMap() {
  const mapNode = $("#world-map");
  if (!mapNode || typeof maplibregl === "undefined") return;

  state.map = new maplibregl.Map({
    container: "world-map",
    style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    bounds: [[-170, -55], [180, 75]],
    fitBoundsOptions: { padding: 36 },
    pitch: 0,
    bearing: 0,
    attributionControl: true
  });

  state.map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
  state.map.on("load", () => {
    renderMapLayers();
    setTimeout(() => state.map.resize(), 250);
  });
}

function clearMarkers() {
  state.markers.forEach(m => m.remove());
  state.markers = [];
}

function addMarker(item, className, label, onClick) {
  const el = document.createElement("button");
  const severity   = String(item.severity || "").toLowerCase();
  const confidence = String(item.confidence || "").toLowerCase().replace(/\s+/g, "-");
  el.className = `${className} marker-${severity} marker-${confidence}`.trim();
  el.type = "button";
  el.textContent = item.sourceCount && item.sourceCount > 1 ? String(item.sourceCount) : label;
  el.title = `${item.location}: ${item.confidence || item.severity || "Signal"}`;
  el.addEventListener("click", onClick);
  const marker = new maplibregl.Marker({ element: el }).setLngLat(item.coords).addTo(state.map);
  state.markers.push(marker);
}

function addQuakeMarker(quake) {
  const el = document.createElement("button");
  el.className = `marker-quake marker-quake-${quake.severity.toLowerCase()}`;
  el.type = "button";
  el.textContent = Number(quake.magnitude).toFixed(1);
  el.title = `M${quake.magnitude} — ${quake.title}`;
  el.addEventListener("click", () => selectQuake(quake));
  const marker = new maplibregl.Marker({ element: el }).setLngLat(quake.coords).addTo(state.map);
  state.markers.push(marker);
}

function renderMapLayers() {
  if (!state.map) return;
  clearMarkers();
  if (state.layers.events) {
    visibleEvents().forEach(event => addMarker(event, "marker-event", "!", () => selectEvent(event)));
  }
  if (state.layers.earthquakes) {
    state.earthquakes.forEach(quake => addQuakeMarker(quake));
  }
}

function selectEvent(event) {
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
    `;
  }
  if (state.map) state.map.flyTo({ center: event.coords, zoom: 4, speed: 0.8 });
}

// ─── Controls ──────────────────────────────────────────────────────────────────

function wireControls() {
  document.addEventListener("click", event => {

    // Category filter
    const filter = event.target.closest("[data-category]");
    if (filter) {
      state.activeCategory = filter.dataset.category;
      renderFilters();
      renderEventLists();
      renderMapLayers();
    }

    // Map layer toggle
    const layer = event.target.closest("[data-layer]");
    if (layer) {
      const key = layer.dataset.layer;
      state.layers[key] = !state.layers[key];
      layer.classList.toggle("active", state.layers[key]);
      renderMapLayers();
    }

    // Conflict event click in list
    const eventItem = event.target.closest("[data-event-index]");
    if (eventItem) {
      const item = visibleEvents()[Number(eventItem.dataset.eventIndex)];
      if (item) selectEvent(item);
    }

    // Earthquake click in list
    const quakeItem = event.target.closest("[data-quake-index]");
    if (quakeItem) {
      const quake = state.earthquakes[Number(quakeItem.dataset.quakeIndex)];
      if (quake) selectQuake(quake);
    }

    // News source tab
    const newsTab = event.target.closest("#news-tabs [data-source]");
    if (newsTab) {
      state.activeNewsSource = newsTab.dataset.source;
      $$("#news-tabs button").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.source === state.activeNewsSource);
      });
      renderNews();
    }

  });
}

// ─── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  startClock();
  wireControls();
  renderFilters();
  renderEventLists();
  renderStats();
  createMap();

  await loadLiveEvents();
  renderFilters();
  renderEventLists();
  renderStats();
  renderMapLayers();
  updateTicker();

  // Non-blocking additional sources
  loadEarthquakes();
  loadNewsFeed();
}

init();