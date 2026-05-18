import { mkdir, writeFile } from "node:fs/promises";

const regions = [
  { name: "Ukraine", coords: [36.23, 49.99], keywords: ["ukraine", "kyiv", "kharkiv", "donetsk", "luhansk", "zaporizhzhia", "crimea", "russia"] },
  { name: "Israel / Gaza", coords: [34.45, 31.45], keywords: ["israel", "gaza", "hamas", "rafah", "jerusalem", "west bank"] },
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

const fallbackEvents = [
  {
    title: "Eastern Ukraine remains a priority conflict watch area",
    location: "Ukraine",
    coords: [36.23, 49.99],
    category: "Conflict",
    severity: "Critical",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: ""
  },
  {
    title: "Israel-Gaza and regional spillover remain under watch",
    location: "Israel / Gaza",
    coords: [34.45, 31.45],
    category: "Conflict",
    severity: "Critical",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: ""
  },
  {
    title: "Red Sea corridor remains under elevated security watch",
    location: "Red Sea / Yemen",
    coords: [43.33, 12.58],
    category: "Conflict",
    severity: "High",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: ""
  },
  {
    title: "Sudan conflict continues to drive regional instability",
    location: "Sudan",
    coords: [30.2, 15.7],
    category: "Conflict",
    severity: "Critical",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: ""
  },
  {
    title: "Pakistan-Afghanistan border activity remains a watch point",
    location: "Pakistan / Afghanistan",
    coords: [69.2, 33.8],
    category: "Unrest",
    severity: "High",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: ""
  },
  {
    title: "South China Sea military pressure remains elevated",
    location: "South China Sea",
    coords: [114.2, 12.2],
    category: "Military",
    severity: "High",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: ""
  },
  {
    title: "Myanmar conflict activity remains under monitoring",
    location: "Myanmar",
    coords: [96.1, 21.9],
    category: "Conflict",
    severity: "High",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: ""
  },
  {
    title: "Sahel security pressure remains regionally significant",
    location: "Sahel",
    coords: [2.5, 15.6],
    category: "Conflict",
    severity: "High",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: ""
  },
  {
    title: "Haiti gang violence remains a public security watch point",
    location: "Haiti",
    coords: [-72.3, 18.9],
    category: "Unrest",
    severity: "High",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: ""
  },
  {
    title: "Korean Peninsula military signaling remains under watch",
    location: "Korean Peninsula",
    coords: [127.5, 38.4],
    category: "Military",
    severity: "High",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: ""
  }
];

function stripHtml(value = "") {
  return String(value).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(value = "") {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
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

function matchRegion(text) {
  const value = text.toLowerCase();
  return regions.find(region => region.keywords.some(keyword => value.includes(keyword)));
}

function normalizeArticle(article, sourceName = "GDELT") {
  const title = stripHtml(article.title || "");
  if (!title) return null;
  const sourceUrl = safeUrl(article.url || "");
  const region = matchRegion(`${title} ${article.description || ""} ${article.domain || ""} ${sourceUrl}`);
  if (!region) return null;
  const category = inferCategory(`${title} ${region.name}`);
  const sourceLabel = article.domain || sourceName;
  return {
    title,
    location: region.name,
    coords: region.coords,
    category,
    severity: severityFor(category, title),
    summary: `Current public reporting signal from ${sourceLabel}. Click through and verify details from the source.`,
    sourceUrl,
    seenDate: article.seendate || article.pubDate || "",
    sourceName: sourceLabel
  };
}

function xmlTag(block, tagName) {
  const match = block.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  if (!match) return "";
  return decodeEntities(match[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim());
}

function parseRssItems(xml, sourceName) {
  const items = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(match => match[0]);
  return items.map(item => normalizeArticle({
    title: xmlTag(item, "title"),
    url: xmlTag(item, "link"),
    description: stripHtml(xmlTag(item, "description")),
    pubDate: xmlTag(item, "pubDate"),
    domain: xmlTag(item, "source") || sourceName
  }, sourceName)).filter(Boolean);
}

async function fetchGdeltEvents() {
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
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&format=json&maxrecords=100&timespan=7d&sort=datedesc`;
  const response = await fetch(url, { headers: { "user-agent": "NergalithWorldConflictTracking/1.0" } });
  if (!response.ok) throw new Error(`GDELT ${response.status}`);
  const data = await response.json();
  const byRegion = new Map();
  for (const article of data.articles || []) {
    const event = normalizeArticle(article, "GDELT");
    if (event && !byRegion.has(event.location)) byRegion.set(event.location, event);
  }
  return [...byRegion.values()].slice(0, 18);
}

async function fetchRssEvents(source) {
  const response = await fetch(source.url, { headers: { "user-agent": "NergalithWorldConflictTracking/1.0" } });
  if (!response.ok) throw new Error(`${source.name} ${response.status}`);
  const xml = await response.text();
  return parseRssItems(xml, source.name);
}

function dedupeEvents(events) {
  const seenTitles = new Set();
  const regionCounts = new Map();
  const deduped = [];

  for (const event of events) {
    const titleKey = event.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 90);
    if (seenTitles.has(titleKey)) continue;
    const count = regionCounts.get(event.location) || 0;
    if (count >= 2) continue;

    seenTitles.add(titleKey);
    regionCounts.set(event.location, count + 1);
    deduped.push(event);
  }

  return deduped.slice(0, 18);
}

async function main() {
  let events = [];
  const sourcesUsed = [];
  let statusLabel = "Conflict feed";
  const rssSources = [
    {
      name: "UN News Peace and Security",
      url: "https://news.un.org/feed/subscribe/en/news/topic/peace-and-security/feed/rss.xml"
    },
    {
      name: "International Crisis Group",
      url: "https://www.crisisgroup.org/rss.xml"
    }
  ];

  try {
    const gdeltEvents = await fetchGdeltEvents();
    if (gdeltEvents.length) {
      sourcesUsed.push("GDELT");
      events.push(...gdeltEvents);
    }
  } catch (error) {
    console.error(`GDELT: ${error.message}`);
  }

  for (const source of rssSources) {
    try {
      const rssEvents = await fetchRssEvents(source);
      if (rssEvents.length) {
        sourcesUsed.push(source.name);
        events.push(...rssEvents);
      }
    } catch (error) {
      console.error(`${source.name}: ${error.message}`);
    }
  }

  events = dedupeEvents(events);

  if (!events.length) {
    sourcesUsed.push("curated fallback");
    statusLabel = "Fallback conflict feed";
    events = fallbackEvents;
  }

  const feed = {
    generatedAt: new Date().toISOString(),
    statusLabel,
    source: sourcesUsed.join(", "),
    events
  };

  await mkdir("data", { recursive: true });
  await writeFile("data/conflict-feed.json", `${JSON.stringify(feed, null, 2)}\n`);
  console.log(`Wrote ${events.length} events from ${feed.source}`);
}

await main();
