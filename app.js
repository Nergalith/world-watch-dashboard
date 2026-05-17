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
        type: "Surveillance pattern",
        status: "Public trace",
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
  if (/earthquake|quake|flood|wildfire|storm|cyclone|hurricane|volcano|disaster/.test(value)) return "Disaster";
  if (/ship|shipping|port|vessel|tanker|red sea|canal|maritime|strait/.test(value)) return "Maritime";
  if (/cyber|ransomware|hack|malware|breach/.test(value)) return "Cyber";
  if (/election|minister|parliament|sanction|diplomat|government|protest|unrest/.test(value)) return "Political";
  if (/power|grid|pipeline|rail|airport|infrastructure|canal/.test(value)) return "Infrastructure";
  return "Conflict";
}

function severityFor(category, text) {
  const value = text.toLowerCase();
  if (/missile|attack|invasion|war|killed|earthquake|tsunami|critical|strike/.test(value)) return "Critical";
  if (category === "Disaster" || category === "Conflict" || category === "Maritime") return "High";
  return "Moderate";
}

function normalizeQuake(feature) {
  const coords = feature.geometry?.coordinates;
  const props = feature.properties || {};
  if (!coords) return null;
  const title = props.title || "Earthquake reported";
  return {
    title,
    location: props.place || "USGS report",
    coords: [coords[0], coords[1]],
    category: "Disaster",
    severity: props.mag >= 5.5 ? "Critical" : props.mag >= 4 ? "High" : "Moderate",
    summary: "Live earthquake signal from the USGS public GeoJSON feed."
  };
}

async function loadLiveEvents() {
  try {
    const response = await fetch("https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson", { cache: "no-store" });
    if (!response.ok) throw new Error(`USGS ${response.status}`);
    const data = await response.json();
    const quakes = (data.features || []).slice(0, 12).map(normalizeQuake).filter(Boolean);
    if (quakes.length) {
      state.events = quakes;
      setStatus("Live public feeds updated");
    }
  } catch (error) {
    setStatus("Curated fallback feed active");
  }
}

function categories() {
  return ["All", ...new Set(state.events.map(event => event.category))];
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
      <p>${item.type}. This public page shows a demo track; live AIS and ADS-B require provider access.</p>
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
