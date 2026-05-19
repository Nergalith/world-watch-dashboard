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

const state = {
  events: fallbackEvents,
  activeCategory: "All",
  layers: {
    events: true
  },
  feedMeta: {
    generatedAt: "",
    source: ""
  },
  map: null,
  markers: [],
  selected: null
};

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

function setStatus(text) {
  const status = $("#feed-status");
  if (status) status.textContent = text;
}

function formatUtc(value = "") {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "";
  return `${new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(time)).replace(",", "")} UTC`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function loadLiveEvents() {
  try {
    const response = await fetch(`data/conflict-feed.json?v=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Feed ${response.status}`);
    const data = await response.json();
    const signals = Array.isArray(data.events) ? data.events.filter(event => Array.isArray(event.coords)) : [];
    if (signals.length) {
      state.events = signals;
      state.feedMeta = {
        generatedAt: data.generatedAt || "",
        source: data.source || ""
      };
      const updated = data.generatedAt ? formatUtc(data.generatedAt) : "recently";
      setStatus(`${data.statusLabel || "Conflict feed"} updated ${updated}`);
    }
  } catch (error) {
    setStatus("Curated conflict feed active");
  }
}

function categories() {
  const preferred = ["All", "Conflict", "Military", "Unrest", "Infrastructure"];
  const extras = state.events.map(event => event.category).filter(category => !preferred.includes(category));
  return [...preferred, ...new Set(extras)];
}

function visibleEvents() {
  if (state.activeCategory === "All") return state.events;
  return state.events.filter(event => event.category === state.activeCategory);
}

function eventTag(event) {
  return `<span class="tag">${escapeHtml(event.category)} / ${escapeHtml(event.severity)}</span>`;
}

function sourceLink(event) {
  if (!event.sourceUrl) return "";
  return `<a class="source-link" href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener">Open source</a>`;
}

function sourceLinks(event) {
  const reports = Array.isArray(event.reports) ? event.reports.filter(report => report.sourceUrl) : [];
  if (!reports.length) return sourceLink(event);
  return `
    <div class="source-stack">
      ${reports.slice(0, 4).map(report => `
        <a class="source-link" href="${escapeHtml(report.sourceUrl)}" target="_blank" rel="noopener">
          ${escapeHtml(report.sourceName || "Open source")}
        </a>
      `).join("")}
    </div>
  `;
}

function itemMeta(...items) {
  return `<div class="meta">${items.filter(Boolean).map(item => `<span>${escapeHtml(item)}</span>`).join("")}</div>`;
}

function formatDate(value = "") {
  return formatUtc(value);
}

function signalMeta(event) {
  const sourceCount = Number(event.sourceCount || (event.sourceName ? 1 : 0));
  const reportCount = Number(event.reportCount || 1);
  const confidence = event.confidence || (sourceCount > 1 ? "Corroborated" : "Single Source");
  const sourceText = sourceCount === 1 ? "1 source" : `${sourceCount} sources`;
  const reportText = reportCount === 1 ? "1 report" : `${reportCount} reports`;
  return itemMeta(event.category, event.severity, confidence, sourceText, reportText, formatDate(event.seenDate));
}

function renderStats() {
  const stats = $("#signal-stats");
  if (!stats) return;
  const events = state.events;
  const highSignals = events.filter(event => ["High Signal", "Corroborated"].includes(event.confidence)).length;
  const sources = new Set(events.flatMap(event => Array.isArray(event.sources) ? event.sources : [event.sourceName]).filter(Boolean));
  const reports = events.reduce((total, event) => total + Number(event.reportCount || 1), 0);
  const updated = state.feedMeta.generatedAt ? formatDate(state.feedMeta.generatedAt) : "Pending";

  stats.innerHTML = [
    ["Signals", events.length],
    ["Reports", reports],
    ["Sources", sources.size || 1],
    ["Updated", updated],
    ["High Signal", highSignals],
    ["Feed", state.feedMeta.source || "Curated"]
  ].map(([label, value]) => `
    <div class="stat-item">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
    </div>
  `).join("");
}

function reportList(event) {
  const reports = Array.isArray(event.reports) ? event.reports.filter(report => report.sourceUrl) : [];
  if (!reports.length) return "";
  return `
    <div class="report-list">
      <div class="panel-title">Top Reports</div>
      ${reports.slice(0, 4).map(report => `
        <a href="${escapeHtml(report.sourceUrl || "#")}" target="_blank" rel="noopener">
          <strong>${escapeHtml(report.title || "Open report")}</strong>
          <span>${escapeHtml(report.sourceName || "Source")}${report.seenDate ? ` / ${escapeHtml(formatDate(report.seenDate))}` : ""}</span>
        </a>
      `).join("")}
    </div>
  `;
}

function renderEventLists() {
  const compact = $("#event-list");
  if (compact) {
    compact.innerHTML = visibleEvents().slice(0, 6).map((event, index) => `
      <article class="list-item" data-event-index="${index}">
        ${itemMeta(event.severity, event.confidence || "Signal", event.sourceCount === 1 ? "1 source" : event.sourceCount ? `${event.sourceCount} sources` : event.sourceName)}
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
  filterRow.innerHTML = categories().map(category => `
    <button class="${category === state.activeCategory ? "active" : ""}" data-category="${category}" type="button">
      ${category}
    </button>
  `).join("");
}

function createMap() {
  const mapNode = $("#world-map");
  if (!mapNode || typeof maplibregl === "undefined") return;

  state.map = new maplibregl.Map({
    container: "world-map",
    style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    center: [22, 18],
    zoom: 2,
    pitch: 20,
    bearing: -6,
    attributionControl: true
  });

  state.map.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
  state.map.on("load", () => {
    renderMapLayers();
    setTimeout(() => state.map.resize(), 250);
  });
}

function clearMarkers() {
  state.markers.forEach(marker => marker.remove());
  state.markers = [];
}

function addMarker(item, className, label, onClick) {
  const el = document.createElement("button");
  const severity = String(item.severity || "").toLowerCase();
  const confidence = String(item.confidence || "").toLowerCase().replace(/\s+/g, "-");
  el.className = `${className} marker-${severity} marker-${confidence}`.trim();
  el.type = "button";
  el.textContent = item.sourceCount && item.sourceCount > 1 ? String(item.sourceCount) : label;
  el.title = `${item.location}: ${item.confidence || item.severity || "Signal"}`;
  el.addEventListener("click", onClick);
  const marker = new maplibregl.Marker({ element: el }).setLngLat(item.coords).addTo(state.map);
  state.markers.push(marker);
}

function renderMapLayers() {
  if (!state.map) return;
  clearMarkers();

  if (state.layers.events) {
    visibleEvents().forEach(event => {
      addMarker(event, "marker-event", "!", () => selectEvent(event));
    });
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

function wireControls() {
  document.addEventListener("click", event => {
    const filter = event.target.closest("[data-category]");
    if (filter) {
      state.activeCategory = filter.dataset.category;
      renderFilters();
      renderEventLists();
      renderMapLayers();
    }

    const layer = event.target.closest("[data-layer]");
    if (layer) {
      const key = layer.dataset.layer;
      state.layers[key] = !state.layers[key];
      layer.classList.toggle("active", state.layers[key]);
      renderMapLayers();
    }

    const eventItem = event.target.closest("[data-event-index]");
    if (eventItem) {
      const item = visibleEvents()[Number(eventItem.dataset.eventIndex)];
      if (item) selectEvent(item);
    }

  });
}

async function init() {
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
}

init();
