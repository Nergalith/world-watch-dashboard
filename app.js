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

const conflictRegions = [
  { name: "Ukraine", coords: [36.23, 49.99], keywords: ["ukraine", "kyiv", "kharkiv", "donetsk", "luhansk", "zaporizhzhia", "crimea", "russia"] },
  { name: "Israel / Gaza", coords: [34.45, 31.45], keywords: ["israel", "gaza", "hamas", "rafah", "jerusalem", "west bank", "hezbollah"] },
  { name: "Lebanon / Israel Border", coords: [35.7, 33.2], keywords: ["lebanon", "beirut", "hezbollah"] },
  { name: "Red Sea / Yemen", coords: [43.33, 12.58], keywords: ["red sea", "yemen", "houthi", "houthis", "bab el-mandeb", "sanaa"] },
  { name: "Sudan", coords: [30.2, 15.7], keywords: ["sudan", "khartoum", "darfur", "rsf"] },
  { name: "Syria", coords: [38.3, 35.0], keywords: ["syria", "damascus", "idlib", "aleppo"] },
  { name: "Iraq", coords: [43.7, 33.2], keywords: ["iraq", "baghdad", "erbil"] },
  { name: "Iran", coords: [53.7, 32.4], keywords: ["iran", "tehran"] },
  { name: "Pakistan / Afghanistan", coords: [69.2, 33.8], keywords: ["pakistan", "afghanistan", "kabul", "taliban", "balochistan"] },
  { name: "Myanmar", coords: [96.1, 21.9], keywords: ["myanmar", "burma", "rakhine", "mandalay"] },
  { name: "Taiwan Strait", coords: [121.0, 24.0], keywords: ["taiwan", "taiwan strait", "pla", "china"] },
  { name: "South China Sea", coords: [114.2, 12.2], keywords: ["south china sea", "philippines", "spratly", "scarborough"] },
  { name: "Korean Peninsula", coords: [127.5, 38.4], keywords: ["north korea", "south korea", "pyongyang", "seoul"] },
  { name: "Sahel", coords: [2.5, 15.6], keywords: ["sahel", "mali", "niger", "burkina faso", "jihadist"] },
  { name: "Somalia", coords: [45.3, 5.2], keywords: ["somalia", "mogadishu", "al-shabaab", "al shabaab"] },
  { name: "Democratic Republic of Congo", coords: [29.2, -1.7], keywords: ["congo", "drc", "goma", "m23"] },
  { name: "Haiti", coords: [-72.3, 18.9], keywords: ["haiti", "port-au-prince", "gang"] },
  { name: "Venezuela / Guyana", coords: [-61.7, 6.8], keywords: ["venezuela", "guyana", "essequibo"] }
];

const state = {
  events: fallbackEvents,
  activeCategory: "All",
  layers: {
    events: true
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

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeUrl(value = "") {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function inferCategory(text) {
  const value = text.toLowerCase();
  if (/missile|airstrike|drone|military|troop|naval|army|weapon|border/.test(value)) return "Military";
  if (/protest|riot|unrest|clash|demonstration|coup/.test(value)) return "Unrest";
  if (/power|grid|pipeline|rail|airport|infrastructure|port|canal|shipping|vessel|tanker|strait/.test(value)) return "Infrastructure";
  return "Conflict";
}

function severityFor(category, text) {
  const value = text.toLowerCase();
  if (/missile|attack|invasion|war|killed|critical|strike|explosion|drone/.test(value)) return "Critical";
  if (category === "Conflict" || category === "Military" || category === "Infrastructure") return "High";
  return "Moderate";
}

function stripHtml(value = "") {
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function firstArticleTitle(html = "") {
  const text = stripHtml(html);
  const parts = text.split(/ - | \| |\. /).map(part => part.trim()).filter(Boolean);
  return parts[0] || "Public OSINT signal";
}

function firstArticleUrl(html = "") {
  const match = String(html).match(/href=["']([^"']+)["']/i);
  return match ? match[1] : "";
}

function matchConflictRegion(text) {
  const value = text.toLowerCase();
  return conflictRegions.find(region => region.keywords.some(keyword => value.includes(keyword)));
}

function normalizeGdeltArticle(article) {
  const title = stripHtml(article.title || "");
  if (!title) return null;
  const sourceUrl = safeUrl(article.url || "");
  const region = matchConflictRegion(`${title} ${article.domain || ""} ${sourceUrl}`);
  if (!region) return null;
  const category = inferCategory(`${title} ${region.name}`);
  return {
    title,
    location: region.name,
    coords: region.coords,
    category,
    severity: severityFor(category, title),
    summary: `Current public reporting signal from ${article.domain || "GDELT"}. Click through and verify details from the source.`,
    sourceUrl,
    seenDate: article.seendate || ""
  };
}

async function loadLiveEvents() {
  try {
    const terms = [
      '"armed conflict"',
      "conflict",
      "war",
      "military",
      "missile",
      "drone",
      "airstrike",
      "clashes",
      "protest",
      "unrest",
      "border",
      "insurgency"
    ];
    const query = terms.join(" OR ");
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&format=json&maxrecords=75&timespan=7d&sort=datedesc`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`GDELT ${response.status}`);
    const data = await response.json();
    const byRegion = new Map();
    (data.articles || []).map(normalizeGdeltArticle).filter(Boolean).forEach(signal => {
      if (!byRegion.has(signal.location)) byRegion.set(signal.location, signal);
    });
    const signals = [...byRegion.values()].slice(0, 12);
    if (signals.length) {
      state.events = signals;
      setStatus("Live 7-day conflict signals updated");
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

function itemMeta(...items) {
  return `<div class="meta">${items.filter(Boolean).map(item => `<span>${escapeHtml(item)}</span>`).join("")}</div>`;
}

function renderEventLists() {
  const compact = $("#event-list");
  if (compact) {
    compact.innerHTML = visibleEvents().slice(0, 6).map((event, index) => `
      <article class="list-item" data-event-index="${index}">
        ${itemMeta(event.category, event.severity)}
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
        ${sourceLink(event)}
        ${itemMeta(event.location, event.seenDate)}
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
  el.className = className;
  el.type = "button";
  el.textContent = label;
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
      ${sourceLink(event)}
      ${itemMeta(event.location, event.seenDate)}
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
  createMap();
  await loadLiveEvents();
  renderFilters();
  renderEventLists();
  renderMapLayers();
}

init();
