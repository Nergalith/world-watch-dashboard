const fallbackEvents = [
  {
    title: "Red Sea shipping corridor remains under elevated disruption watch",
    location: "Bab el-Mandeb",
    coords: [43.33, 12.58],
    category: "Maritime",
    severity: "High",
    summary: "Strategic traffic through the southern Red Sea remains a high-sensitivity indicator for energy, insurance, and naval risk."
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
    title: "South China Sea patrols increase pressure near contested waters",
    location: "South China Sea",
    coords: [114.2, 12.2],
    category: "Political",
    severity: "High",
    summary: "Maritime patrol patterns and sovereignty disputes keep the region in an elevated monitoring posture."
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
    title: "Cyber advisory activity highlights infrastructure exposure",
    location: "North America / Europe",
    coords: [-20.0, 43.0],
    category: "Cyber",
    severity: "Moderate",
    summary: "Public advisories and reporting continue to flag critical infrastructure and government networks as recurring targets."
  },
  {
    title: "Energy infrastructure routes remain sensitive to regional shocks",
    location: "Persian Gulf",
    coords: [52.2, 25.8],
    category: "Infrastructure",
    severity: "High",
    summary: "Energy transit lanes and regional infrastructure remain high-value indicators for market and security risk."
  }
];

const transportTracks = [
  {
    group: "Ships",
    markerClass: "marker-ship",
    color: "#42c8ff",
    items: [
      {
        name: "Red Sea convoy lane",
        type: "Cargo group",
        status: "Delay risk",
        coords: [43.1, 13.1],
        path: [[39.2, 21.5], [41.1, 18.2], [43.1, 13.1], [45.0, 11.9]]
      },
      {
        name: "Hormuz tanker flow",
        type: "Energy transit",
        status: "Watched",
        coords: [56.4, 26.3],
        path: [[51.4, 25.4], [54.2, 25.8], [56.4, 26.3], [59.0, 25.2]]
      },
      {
        name: "Panama canal queue",
        type: "Container route",
        status: "Constraint",
        coords: [-79.6, 9.1],
        path: [[-83.8, 9.6], [-81.4, 9.3], [-79.6, 9.1], [-77.6, 9.4]]
      }
    ]
  },
  {
    group: "Aircraft",
    markerClass: "marker-aircraft",
    color: "#f6a43a",
    items: [
      {
        name: "Eastern Europe ISR corridor",
        type: "Aviation watch area",
        status: "Demo layer",
        coords: [30.8, 47.1],
        path: [[22.4, 46.2], [26.8, 47.7], [30.8, 47.1], [34.8, 46.4]]
      },
      {
        name: "Eastern Med patrol loop",
        type: "Maritime patrol",
        status: "Regional watch",
        coords: [33.6, 34.2],
        path: [[28.6, 34.6], [31.1, 35.2], [33.6, 34.2], [35.7, 33.1]]
      },
      {
        name: "Taiwan Strait air activity",
        type: "Aviation watch",
        status: "Elevated",
        coords: [121.0, 24.0],
        path: [[118.8, 23.6], [120.2, 24.4], [121.0, 24.0], [122.8, 24.7]]
      }
    ]
  }
];

const state = {
  events: fallbackEvents,
  activeCategory: "All",
  layers: {
    events: true,
    ships: true,
    aircraft: true,
    routes: true
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

function inferCategory(text) {
  const value = text.toLowerCase();
  if (/ship|shipping|port|vessel|tanker|red sea|canal|maritime|strait/.test(value)) return "Maritime";
  if (/cyber|ransomware|hack|malware|breach/.test(value)) return "Cyber";
  if (/election|minister|parliament|sanction|diplomat|government|protest|unrest/.test(value)) return "Political";
  if (/power|grid|pipeline|rail|airport|infrastructure|canal/.test(value)) return "Infrastructure";
  return "Conflict";
}

function severityFor(category, text) {
  const value = text.toLowerCase();
  if (/missile|attack|invasion|war|killed|critical|strike|explosion|drone/.test(value)) return "Critical";
  if (category === "Conflict" || category === "Maritime" || category === "Infrastructure") return "High";
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

function normalizeGdeltFeature(feature) {
  const coords = feature.geometry?.coordinates;
  const props = feature.properties || {};
  if (!coords) return null;
  const raw = props.html || props.name || props.description || "";
  const title = firstArticleTitle(raw);
  const location = props.name || props.location || props.country || "Public OSINT signal";
  const category = inferCategory(`${title} ${location} ${raw}`);
  return {
    title,
    location: stripHtml(location),
    coords: [coords[0], coords[1]],
    category,
    severity: severityFor(category, `${title} ${raw}`),
    summary: "Live public signal from GDELT news geography. Treat as an indicator, then verify from primary reporting."
  };
}

async function loadLiveEvents() {
  try {
    const terms = [
      "conflict",
      "military",
      "missile",
      "drone",
      "protest",
      "unrest",
      "sanctions",
      "shipping",
      "maritime",
      "cyberattack",
      "infrastructure"
    ];
    const query = `(${terms.join(" OR ")})`;
    const url = `https://api.gdeltproject.org/api/v2/geo/geo?query=${encodeURIComponent(query)}&mode=pointdata&format=geojson&timespan=24h&maxpoints=18`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`GDELT ${response.status}`);
    const data = await response.json();
    const signals = (data.features || []).map(normalizeGdeltFeature).filter(Boolean).slice(0, 12);
    if (signals.length) {
      state.events = signals;
      setStatus("Live OSINT signals updated");
    }
  } catch (error) {
    setStatus("Curated OSINT feed active");
  }
}

function categories() {
  const preferred = ["All", "Conflict", "Maritime", "Political", "Cyber", "Infrastructure"];
  const extras = state.events.map(event => event.category).filter(category => !preferred.includes(category));
  return [...preferred, ...new Set(extras)];
}

function visibleEvents() {
  if (state.activeCategory === "All") return state.events;
  return state.events.filter(event => event.category === state.activeCategory);
}

function eventTag(event) {
  return `<span class="tag">${event.category} / ${event.severity}</span>`;
}

function itemMeta(...items) {
  return `<div class="meta">${items.map(item => `<span>${item}</span>`).join("")}</div>`;
}

function renderEventLists() {
  const compact = $("#event-list");
  if (compact) {
    compact.innerHTML = visibleEvents().slice(0, 6).map((event, index) => `
      <article class="list-item" data-event-index="${index}">
        ${itemMeta(event.category, event.severity)}
        <h3>${event.title}</h3>
        <span class="tag">${event.location}</span>
      </article>
    `).join("");
  }

  const grid = $("#event-grid");
  if (grid) {
    grid.innerHTML = visibleEvents().map(event => `
      <article class="event-card">
        ${eventTag(event)}
        <h2>${event.title}</h2>
        <p>${event.summary}</p>
        ${itemMeta(event.location)}
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

function renderTransportLists() {
  const html = transportTracks.flatMap(group =>
    group.items.map(item => `
      <article class="list-item" data-transport="${item.name}">
        ${itemMeta(group.group, item.status)}
        <h3>${item.name}</h3>
        <span class="tag">${item.type}</span>
      </article>
    `)
  ).join("");

  const compact = $("#transport-list");
  if (compact) compact.innerHTML = html;
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

  transportTracks.forEach(group => {
    const isShip = group.group === "Ships";
    const layerEnabled = isShip ? state.layers.ships : state.layers.aircraft;
    const sourceId = `${group.group.toLowerCase()}-routes`;
    const layerId = `${sourceId}-line`;
    const data = {
      type: "FeatureCollection",
      features: state.layers.routes && layerEnabled
        ? group.items.map(item => ({
            type: "Feature",
            properties: { name: item.name },
            geometry: { type: "LineString", coordinates: item.path }
          }))
        : []
    };

    if (state.map.getSource(sourceId)) {
      state.map.getSource(sourceId).setData(data);
    } else {
      state.map.addSource(sourceId, { type: "geojson", data });
      state.map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": group.color,
          "line-width": 2,
          "line-opacity": 0.65,
          "line-dasharray": [1.5, 1.2]
        }
      });
    }

    if (layerEnabled) {
      group.items.forEach(item => {
        addMarker(item, group.markerClass, isShip ? "S" : "A", () => selectTransport(item, group.group));
      });
    }
  });
}

function selectEvent(event) {
  state.selected = event;
  const panel = $("#selected-panel");
  if (panel) {
    panel.innerHTML = `
      ${eventTag(event)}
      <h2>${event.title}</h2>
      <p>${event.summary}</p>
      ${itemMeta(event.location)}
    `;
  }
  if (state.map) state.map.flyTo({ center: event.coords, zoom: 4, speed: 0.8 });
}

function selectTransport(item, group) {
  const panel = $("#selected-panel");
  if (panel) {
    panel.innerHTML = `
      <span class="tag">${group} / ${item.status}</span>
      <h2>${item.name}</h2>
      <p>${item.type}. Transport Watch shows public route awareness and demo transponder layers for quick context.</p>
    `;
  }
  if (state.map) state.map.flyTo({ center: item.coords, zoom: 4, speed: 0.8 });
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

    const transportItem = event.target.closest("[data-transport]");
    if (transportItem) {
      const match = transportTracks.flatMap(group => group.items.map(item => ({ item, group: group.group })))
        .find(entry => entry.item.name === transportItem.dataset.transport);
      if (match) selectTransport(match.item, match.group);
    }
  });
}

async function init() {
  wireControls();
  renderFilters();
  renderEventLists();
  renderTransportLists();
  createMap();
  await loadLiveEvents();
  renderFilters();
  renderEventLists();
  renderMapLayers();
}

init();
