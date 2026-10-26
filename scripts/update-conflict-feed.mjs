import { mkdir, readFile, writeFile } from "node:fs/promises";

const USER_AGENT = "NergalithWorldConflictTracking/1.0";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with timeout and a small, polite retry (max 3 attempts). Honors Retry-After on 429/503.
async function fetchWithRetry(url, { attempts = 3, baseDelayMs = 5000, timeoutMs = 25000 } = {}) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "user-agent": USER_AGENT }, signal: AbortSignal.timeout(timeoutMs) });
      if (response.ok) return response;
      lastError = new Error(`HTTP ${response.status}`);
      if (![429, 500, 502, 503, 504].includes(response.status)) throw lastError;
      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 60000) : baseDelayMs * 2 ** (attempt - 1);
      if (attempt < attempts) {
        console.log(`  ${url.slice(0, 60)}... ${lastError.message}, retry ${attempt}/${attempts - 1} in ${Math.round(delay / 1000)}s`);
        await sleep(delay);
      }
    } catch (error) {
      lastError = error.name === "TimeoutError" ? new Error("timeout") : error;
      if (/^HTTP 4/.test(lastError.message) && !lastError.message.includes("429")) throw lastError;
      if (attempt < attempts) await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}


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
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Israel-Gaza and regional spillover remain under watch",
    location: "Israel / Gaza",
    coords: [34.45, 31.45],
    category: "Conflict",
    severity: "Critical",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Red Sea corridor remains under elevated security watch",
    location: "Red Sea / Yemen",
    coords: [43.33, 12.58],
    category: "Military Hotspots",
    severity: "High",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Sudan conflict continues to drive regional instability",
    location: "Sudan",
    coords: [30.2, 15.7],
    category: "Conflict",
    severity: "Critical",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Pakistan-Afghanistan border activity remains a watch point",
    location: "Pakistan / Afghanistan",
    coords: [69.2, 33.8],
    category: "Uprisings/Protests",
    severity: "High",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "South China Sea military pressure remains elevated",
    location: "South China Sea",
    coords: [114.2, 12.2],
    category: "Military Hotspots",
    severity: "High",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Myanmar conflict activity remains under monitoring",
    location: "Myanmar",
    coords: [96.1, 21.9],
    category: "Conflict",
    severity: "High",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Sahel security pressure remains regionally significant",
    location: "Sahel",
    coords: [2.5, 15.6],
    category: "Military Hotspots",
    severity: "High",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Haiti gang violence remains a public security watch point",
    location: "Haiti",
    coords: [-72.3, 18.9],
    category: "Uprisings/Protests",
    severity: "High",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Korean Peninsula military signaling remains under watch",
    location: "Korean Peninsula",
    coords: [127.5, 38.4],
    category: "Military Hotspots",
    severity: "High",
    summary: "Curated fallback watch area. Live public feeds were unavailable during the last refresh.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Gaza humanitarian crisis and operations continue",
    location: "Israel / Gaza",
    coords: [34.45, 31.45],
    category: "Conflict",
    severity: "Critical",
    summary: "Curated fallback for ongoing high-intensity conflict zone with significant civilian impact.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "RSF-SAF clashes persist across Sudan",
    location: "Sudan",
    coords: [30.2, 15.7],
    category: "Conflict",
    severity: "Critical",
    summary: "Curated fallback for major internal conflict with widespread displacement.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Houthi maritime attacks in Red Sea",
    location: "Red Sea / Yemen",
    coords: [43.33, 12.58],
    category: "Military Hotspots",
    severity: "High",
    summary: "Curated fallback for ongoing attacks on shipping and international response.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Protests and crackdowns in Myanmar",
    location: "Myanmar",
    coords: [96.1, 21.9],
    category: "Uprisings/Protests",
    severity: "High",
    summary: "Curated fallback for ongoing resistance and military operations.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "DRC M23 and allied forces activity",
    location: "Democratic Republic of Congo",
    coords: [29.2, -1.7],
    category: "Military Hotspots",
    severity: "High",
    summary: "Curated fallback for regional conflict involving multiple armed groups.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Iran-Israel tensions and proxy actions",
    location: "Iran",
    coords: [53.7, 32.4],
    category: "Military Hotspots",
    severity: "High",
    summary: "Curated fallback for escalating regional military posturing.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Taiwan Strait PLA maneuvers",
    location: "Taiwan Strait",
    coords: [121.0, 24.0],
    category: "Military Hotspots",
    severity: "High",
    summary: "Curated fallback for military exercises and sovereignty tensions.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Sahel coups and jihadist expansion",
    location: "Sahel",
    coords: [2.5, 15.6],
    category: "Uprisings/Protests",
    severity: "High",
    summary: "Curated fallback for instability, coups, and militant activity across the region.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Intense fighting in eastern Ukraine frontlines",
    location: "Ukraine",
    coords: [36.23, 49.99],
    category: "Military Hotspots",
    severity: "Critical",
    summary: "Curated fallback: ongoing artillery and drone strikes with high civilian risk.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Gaza ground operations and airstrikes escalate",
    location: "Israel / Gaza",
    coords: [34.45, 31.45],
    category: "Conflict",
    severity: "Critical",
    summary: "Curated fallback: dense urban combat and humanitarian access issues.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "RSF advances and SAF counteroffensives in Sudan",
    location: "Sudan",
    coords: [30.2, 15.7],
    category: "Military Hotspots",
    severity: "Critical",
    summary: "Curated fallback: major clashes displacing thousands in Khartoum region.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Houthi attacks on commercial shipping in Red Sea",
    location: "Red Sea / Yemen",
    coords: [43.33, 12.58],
    category: "Military Hotspots",
    severity: "High",
    summary: "Curated fallback: missile and drone strikes prompting international naval response.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Large-scale protests against military rule in Myanmar",
    location: "Myanmar",
    coords: [96.1, 21.9],
    category: "Uprisings/Protests",
    severity: "High",
    summary: "Curated fallback: widespread demonstrations met with violent crackdowns.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "M23 rebel offensive near Goma, DRC",
    location: "Democratic Republic of Congo",
    coords: [29.2, -1.7],
    category: "Military Hotspots",
    severity: "High",
    summary: "Curated fallback: rebel advances threatening major city and regional stability.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Iran-backed proxy attacks on US assets in Middle East",
    location: "Iran",
    coords: [53.7, 32.4],
    category: "Military Hotspots",
    severity: "High",
    summary: "Curated fallback: escalating strikes and retaliation risks across region.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "PLA naval exercises encircling Taiwan",
    location: "Taiwan Strait",
    coords: [121.0, 24.0],
    category: "Military Hotspots",
    severity: "High",
    summary: "Curated fallback: large-scale military drills simulating blockade.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Jihadist attacks and military responses in Sahel",
    location: "Sahel",
    coords: [2.5, 15.6],
    category: "Military Hotspots",
    severity: "High",
    summary: "Curated fallback: coordinated assaults on bases and villages.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Border clashes between Pakistan and Afghanistan",
    location: "Pakistan / Afghanistan",
    coords: [69.2, 33.8],
    category: "Uprisings/Protests",
    severity: "High",
    summary: "Curated fallback: militant cross-border activity and security operations.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "South China Sea island building and patrols intensify",
    location: "South China Sea",
    coords: [114.2, 12.2],
    category: "Military Hotspots",
    severity: "High",
    summary: "Curated fallback: increased naval presence and territorial disputes.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  // === NEW high-priority fallbacks for current events (US-Iran, etc.) ===
  {
    title: "US-Iran direct strikes after helicopter incident in Strait of Hormuz",
    location: "Strait of Hormuz",
    coords: [56.5, 26.5],
    category: "Military Hotspots",
    severity: "Critical",
    summary: "Curated: US and Iran exchange strikes following downing of helicopter in key oil transit chokepoint. Escalation risk high.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Iranian missile strikes on US Gulf bases",
    location: "Gulf bases",
    coords: [50.0, 26.0],
    category: "Military Hotspots",
    severity: "Critical",
    summary: "Curated: Direct Iranian response targeting US military installations in the Persian Gulf after Hormuz incident.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "US airstrikes on Iranian targets near Tehran",
    location: "Tehran",
    coords: [51.4, 35.7],
    category: "Military Hotspots",
    severity: "Critical",
    summary: "Curated: US launches precision strikes on Iranian military sites in capital region amid Hormuz escalation.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Red Sea Houthi attacks on US and allied shipping intensify",
    location: "Red Sea / Bab el-Mandeb",
    coords: [43.33, 12.58],
    category: "Military Hotspots",
    severity: "Critical",
    summary: "Curated: Multiple drone and missile attacks on commercial and military vessels in strategic waterway.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Israel-Gaza ceasefire collapses with new rocket and airstrike exchanges",
    location: "Israel / Gaza",
    coords: [34.45, 31.45],
    category: "Conflict",
    severity: "Critical",
    summary: "Curated: Major escalation with heavy civilian casualties reported in renewed fighting.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Sudan RSF captures key capital districts in Khartoum fighting",
    location: "Sudan",
    coords: [32.5, 15.6],
    category: "Military Hotspots",
    severity: "Critical",
    summary: "Curated: Intense urban combat displacing hundreds of thousands; humanitarian crisis deepens.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Ukraine forces repel major Russian offensive near Donetsk",
    location: "Ukraine",
    coords: [37.8, 48.0],
    category: "Military Hotspots",
    severity: "Critical",
    summary: "Curated: Heavy fighting with significant armor losses on both sides along eastern front.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Pakistan-Afghanistan border skirmishes kill dozens in cross-border fire",
    location: "Pakistan / Afghanistan",
    coords: [69.5, 33.5],
    category: "Uprisings/Protests",
    severity: "High",
    summary: "Curated: Taliban and Pakistani forces clash amid rising militant infiltration.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "China-Philippines naval standoff escalates in South China Sea",
    location: "South China Sea",
    coords: [116.0, 11.0],
    category: "Military Hotspots",
    severity: "High",
    summary: "Curated: Water cannon incidents and ramming between coast guards near disputed features.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Iranian proxies launch fresh attacks on Israel from multiple fronts",
    location: "Lebanon / Israel Border",
    coords: [35.5, 33.5],
    category: "Military Hotspots",
    severity: "Critical",
    summary: "Curated: Hezbollah and other groups exchange fire with Israeli forces in northern border region.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Major protests erupt in Tehran over economic crisis and foreign policy",
    location: "Iran",
    coords: [51.4, 35.7],
    category: "Uprisings/Protests",
    severity: "High",
    summary: "Curated: Widespread demonstrations met with security crackdown amid Hormuz tensions.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "US carrier strike group deploys to Persian Gulf in response to Iran",
    location: "Strait of Hormuz",
    coords: [56.0, 26.0],
    category: "Military Hotspots",
    severity: "Critical",
    summary: "Curated: Significant US naval buildup following direct exchanges with Iranian forces.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Red Sea coalition launches strikes on Houthi positions in Yemen",
    location: "Red Sea / Yemen",
    coords: [44.0, 13.0],
    category: "Military Hotspots",
    severity: "Critical",
    summary: "Curated: US-UK led operations target launch sites after attacks on international shipping.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Syrian regime and rebels clash near Damascus amid regional spillover",
    location: "Syria",
    coords: [36.3, 33.5],
    category: "Conflict",
    severity: "High",
    summary: "Curated: Renewed fighting as Iran-backed and opposition forces maneuver.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
  },
  {
    title: "Iraq militias strike US interests in retaliation for Hormuz strikes",
    location: "Iraq",
    coords: [44.4, 33.3],
    category: "Military Hotspots",
    severity: "High",
    summary: "Curated: Drone and rocket attacks on bases and diplomatic sites.",
    sourceUrl: "",
    seenDate: "",
    sourceName: "Curated fallback",
    sourceCount: 1,
    reportCount: 1,
    confidence: "Single Source",
    curated: true
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
  if (/protest|demonstration|uprising|riot|strike|march|rally|civil unrest|tehran protest/.test(value)) return "Uprisings/Protests";
  if (/missile|airstrike|drone|military|troop|naval|army|battle|explosion|shelling|offensive|air strike|drone strike|us-iran|hormuz|helicopter|carrier strike|naval buildup/.test(value)) return "Military Hotspots";
  if (/power|grid|pipeline|rail|airport|infrastructure|port|canal|shipping|vessel|tanker|strait/.test(value)) return "Infrastructure";
  if (/clash|violence|attack|killed|strike|assault|raid|bombing|fighting|direct strike|retaliation/.test(value)) return "Conflict";
  return "Conflict";
}

function severityFor(category, text) {
  const value = text.toLowerCase();
  if (/missile|attack|invasion|war|killed|critical|strike|explosion|drone|battle|fatalities|direct strike|us-iran|hormuz|helicopter incident|carrier/.test(value)) return "Critical";
  if (category === "Uprisings/Protests" || category === "Military Hotspots" || category === "Conflict" || category === "Infrastructure") return "High";
  return "Moderate";
}

function severityRank(severity) {
  return { Critical: 3, High: 2, Moderate: 1 }[severity] || 0;
}

function dateValue(value = "") {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function matchRegion(text) {
  const value = text.toLowerCase();
  return regions
    .map(region => {
      const matches = region.keywords.filter(keyword => value.includes(keyword));
      const score = matches.reduce((total, keyword) => total + keyword.length, 0);
      return { region, score, matches: matches.length };
    })
    .filter(result => result.matches > 0)
    .sort((a, b) => b.matches - a.matches || b.score - a.score)[0]?.region;
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

// Small tolerant RSS/Atom helpers. NOTE: the old version built the regex from a template
// string, which silently turned "\\s" into "s" and "[\\s\\S]" into "[sS]", so no tag ever matched.
function xmlTag(block, tagName) {
  const pattern = new RegExp("<" + tagName + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + tagName + ">", "i");
  const match = block.match(pattern);
  if (!match) {
    // Atom-style <link href="..."/>
    if (tagName === "link") {
      const href = block.match(/<link\b[^>]*\bhref=["']([^"']+)["']/i);
      return href ? decodeEntities(href[1]) : "";
    }
    return "";
  }
  const inner = match[1].trim().replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, "$1");
  return decodeEntities(inner.trim());
}

function xmlItems(xml) {
  return [...String(xml).matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map(match => match[0]);
}

function parseRssItems(xml, sourceName) {
  const items = xmlItems(xml);
  return items.map(item => normalizeArticle({
    title: xmlTag(item, "title"),
    url: xmlTag(item, "link"),
    description: stripHtml(xmlTag(item, "description")),
    pubDate: xmlTag(item, "pubDate") || xmlTag(item, "updated"),
    domain: xmlTag(item, "source") || sourceName
  }, sourceName)).filter(Boolean);
}

function parseNewsItems(xml, sourceName) {
  const items = xmlItems(xml);
  return items.map(item => {
    const title = stripHtml(decodeEntities(xmlTag(item, "title")));
    const link = safeUrl(xmlTag(item, "link"));
    const summary = stripHtml(decodeEntities(xmlTag(item, "description")));
    if (!title || !link || !isRelevantNews(`${title} ${summary}`)) return null;
    return {
      title,
      link,
      source: sourceName,
      publishedAt: xmlTag(item, "pubDate") || xmlTag(item, "updated")
    };
  }).filter(Boolean);
}

function isRelevantNews(value = "") {
  return /\b(war|conflict|attack|airstrike|strike|military|troop|missile|drone|defen[cs]e|security|crisis|violence|gaza|israel|iran|ukraine|russia|sudan|congo|drc|lebanon|syria|yemen|haiti|china|taiwan|north korea|sanction|ceasefire|peace|nuclear|election|protest|coup|earthquake|flood|wildfire|storm|hurricane|cyclone|outage|pipeline|shipping|oil|port|canal|border|refugee|humanitarian)\b/i.test(value);
}

async function fetchGdeltEvents() {
  const terms = [
    // Strong focus on current escalations: Iran, US, Israel, Gulf, Red Sea, specific recent keywords
    '"armed conflict"',
    "conflict",
    "war",
    "military",
    "missile",
    "drone",
    "airstrike",
    "strike",
    "helicopter",
    "hormuz",
    "strait of hormuz",
    "gulf",
    "iran",
    "us-iran",
    "israel",
    "red sea",
    "bab el-mandeb",
    "clashes",
    "protest",
    "uprising",
    "unrest",
    "demonstration",
    "violence",
    "border",
    "insurgency",
    "offensive",
    // CAMEO codes for richer conflict/protest/military focus (last 24-72h)
    "CAMEO:14*", // Protest
    "CAMEO:15*", // Exhibit force posture
    "CAMEO:18*", // Assault
    "CAMEO:19*", // Fight
    "CAMEO:20*"  // Use unconventional mass violence
  ];
  const query = terms.join(" OR ");
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=ArtList&format=json&maxrecords=500&timespan=3d&sort=datedesc`;
  // GDELT rate-limits aggressively (HTTP 429); back off 10s, 20s between at most 3 attempts.
  const response = await fetchWithRetry(url, { attempts: 3, baseDelayMs: 10000 });
  const data = await response.json();
  const collected = [];
  for (const article of data.articles || []) {
    const event = normalizeArticle(article, "GDELT");
    if (event) collected.push(event);
  }
  // Allow multiple signals per broad region for higher volume (30-100+); groupSignals will still aggregate per location
  return collected.slice(0, 150);
}

async function fetchACLED() {
  const apiKey = process.env.ACLED_API_KEY;
  if (!apiKey) {
    console.log("ACLED_API_KEY not set, skipping ACLED (public sources only)");
    return [];
  }
  // ACLED API typically requires a registered email as well for authentication.
  // Set ACLED_EMAIL in env/secrets for full access; falls back to placeholder (may be limited).
  const email = process.env.ACLED_EMAIL || "public@nergalith.example";
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  // Focus on conflict/protest/military event types, recent
  const url = `https://api.acleddata.com/acled/read?key=${apiKey}&email=${email}&limit=100&event_date=${twoDaysAgo}&event_type=Explosions%2FRemote%20violence|Battles|Violence%20against%20civilians|Riots|Protests&fields=event_date,event_type,sub_event_type,actor1,actor2,location,latitude,longitude,fatalities,notes,source`;
  try {
    const response = await fetch(url, { headers: { "user-agent": "NergalithWorldConflictTracking/1.0" } });
    if (!response.ok) throw new Error(`ACLED ${response.status}`);
    const data = await response.json();
    if (!data || !Array.isArray(data.data)) return [];
    return data.data
      .map((item) => {
        const lat = parseFloat(item.latitude);
        const lon = parseFloat(item.longitude);
        if (!isFinite(lat) || !isFinite(lon)) return null;
        const et = (item.event_type || "").toLowerCase();
        let category = "Conflict";
        if (et.includes("protest") || et.includes("riot")) category = "Uprisings/Protests";
        else if (et.includes("battle") || et.includes("explosion") || et.includes("remote violence")) category = "Military Hotspots";
        const fatalities = parseInt(item.fatalities || 0, 10);
        const severity = fatalities > 10 ? "Critical" : fatalities > 2 ? "High" : "High";
        const title = `${item.sub_event_type || item.event_type || "Incident"} - ${item.location}`;
        const summary = item.notes ? stripHtml(item.notes).slice(0, 220) : `ACLED recorded ${item.event_type} involving ${item.actor1 || "parties"}.`;
        return {
          title: title.slice(0, 160),
          location: item.location,
          coords: [lon, lat], // [lng, lat] for MapLibre
          category,
          severity,
          summary: `ACLED: ${summary}`,
          sourceUrl: "https://acleddata.com/",
          seenDate: item.event_date ? `${item.event_date}T00:00:00Z` : "",
          sourceName: "ACLED",
          sourceCount: 1,
          reportCount: Math.max(1, fatalities + 1),
          confidence: "Single Source"
        };
      })
      .filter(Boolean);
  } catch (error) {
    console.error(`ACLED: ${error.message}`);
    return [];
  }
}

async function fetchRssEvents(source) {
  const response = await fetchWithRetry(source.url, { attempts: 2, baseDelayMs: 3000 });
  const xml = await response.text();
  return { raw: xmlItems(xml).length, events: parseRssItems(xml, source.name) };
}

async function fetchRssNews(source) {
  const response = await fetchWithRetry(source.url, { attempts: 2, baseDelayMs: 3000 });
  const xml = await response.text();
  return { raw: xmlItems(xml).length, items: parseNewsItems(xml, source.name) };
}

function dedupeNews(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeArticles(events) {
  const seenTitles = new Set();
  const deduped = [];

  for (const event of events) {
    const titleKey = event.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 90);
    if (seenTitles.has(titleKey)) continue;

    seenTitles.add(titleKey);
    deduped.push(event);
  }

  return deduped;
}

function confidenceFor(sourceCount, reportCount) {
  if (sourceCount >= 2 && reportCount >= 4) return "High Signal";
  if (sourceCount >= 2) return "Corroborated";
  if (reportCount >= 3) return "Multiple Reports";
  return "Single Source";
}

function summarizeSignal(location, reportCount, sourceCount, topCategory) {
  const sourceText = sourceCount === 1 ? "source" : "sources";
  const reportText = reportCount === 1 ? "report" : "reports";
  return `${location} is active on the public watch board with ${reportCount} ${reportText} across ${sourceCount} ${sourceText}. Category is currently assessed as ${topCategory}.`;
}

function signalTitle(location, severity, confidence, reportCount) {
  if (confidence === "High Signal") return `${location}: high-signal conflict watch`;
  if (confidence === "Corroborated") return `${location}: corroborated conflict signal`;
  if (confidence === "Multiple Reports") return `${location}: repeated public reporting`;
  if (severity === "Critical") return `${location}: critical conflict watch`;
  return `${location}: public conflict signal`;
}

function groupSignals(events) {
  const groups = new Map();

  for (const event of dedupeArticles(events)) {
    const existing = groups.get(event.location) || {
      title: event.title,
      location: event.location,
      coords: event.coords,
      category: event.category,
      severity: event.severity,
      summary: "",
      sourceUrl: event.sourceUrl,
      seenDate: event.seenDate,
      sourceName: event.sourceName,
      reports: [],
      sourceNames: new Set(),
      latestTimestamp: 0
    };

    existing.reports.push({
      title: event.title,
      sourceName: event.sourceName || "Unknown source",
      sourceUrl: event.sourceUrl || "",
      seenDate: event.seenDate || "",
      category: event.category,
      severity: event.severity
    });
    existing.sourceNames.add(event.sourceName || "Unknown source");

    if (severityRank(event.severity) > severityRank(existing.severity)) existing.severity = event.severity;
    if (dateValue(event.seenDate) > existing.latestTimestamp) {
      existing.latestTimestamp = dateValue(event.seenDate);
      existing.title = event.title;
      existing.category = event.category;
      existing.sourceUrl = event.sourceUrl;
      existing.seenDate = event.seenDate;
      existing.sourceName = event.sourceName;
    }

    groups.set(event.location, existing);
  }

  return [...groups.values()]
    .map(group => {
      const reports = group.reports
        .sort((a, b) => dateValue(b.seenDate) - dateValue(a.seenDate))
        .slice(0, 5);
      const sourceNames = [...group.sourceNames].sort();
      return {
        title: signalTitle(group.location, group.severity, confidenceFor(sourceNames.length, group.reports.length), group.reports.length),
        location: group.location,
        coords: group.coords,
        category: group.category,
        severity: group.severity,
        summary: summarizeSignal(group.location, group.reports.length, sourceNames.length, group.category),
        sourceUrl: group.sourceUrl,
        seenDate: group.seenDate,
        sourceName: group.sourceName,
        sourceCount: sourceNames.length,
        reportCount: group.reports.length,
        confidence: confidenceFor(sourceNames.length, group.reports.length),
        sources: sourceNames,
        reports
      };
    })
    .sort((a, b) => {
      const severityDelta = severityRank(b.severity) - severityRank(a.severity);
      if (severityDelta) return severityDelta;
      return (b.reportCount || 0) - (a.reportCount || 0);
    })
    .slice(0, 80);
}

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

function sourceStatus(name, kind, startedAt, result) {
  return {
    name,
    kind,
    status: result.status,
    items: result.items || 0,
    rawItems: result.rawItems ?? null,
    error: result.error || "",
    checkedAt: startedAt
  };
}

function ageText(fromIso, toIso) {
  const ms = Date.parse(toIso) - Date.parse(fromIso);
  if (!Number.isFinite(ms) || ms < 0) return "";
  const hours = Math.round(ms / 3600000);
  return hours < 1 ? "under 1 hour" : hours < 48 ? `${hours} hours` : `${Math.round(hours / 24)} days`;
}

async function main() {
  const now = new Date().toISOString();
  const liveEvents = [];
  const statuses = [];

  // ACLED is optional; it only runs when ACLED_API_KEY is configured as a secret.
  if (process.env.ACLED_API_KEY) {
    try {
      const acledEvents = await fetchACLED();
      liveEvents.push(...acledEvents);
      statuses.push(sourceStatus("ACLED", "conflict", now, { status: acledEvents.length ? "up" : "empty", items: acledEvents.length }));
    } catch (error) {
      statuses.push(sourceStatus("ACLED", "conflict", now, { status: "failed", error: error.message }));
    }
  } else {
    statuses.push(sourceStatus("ACLED", "conflict", now, { status: "skipped", error: "No API key configured (optional)" }));
  }

  try {
    const gdeltEvents = await fetchGdeltEvents();
    liveEvents.push(...gdeltEvents);
    statuses.push(sourceStatus("GDELT", "conflict", now, { status: gdeltEvents.length ? "up" : "empty", items: gdeltEvents.length }));
  } catch (error) {
    console.error(`GDELT: ${error.message}`);
    statuses.push(sourceStatus("GDELT", "conflict", now, { status: "failed", error: error.message }));
  }

  // Reuters' public RSS (feeds.reuters.com) was retired and no longer resolves; replaced with UN News Africa.
  const rssSources = [
    { name: "UN News Peace and Security", url: "https://news.un.org/feed/subscribe/en/news/topic/peace-and-security/feed/rss.xml" },
    { name: "UN News Africa", url: "https://news.un.org/feed/subscribe/en/news/region/africa/feed/rss.xml" },
    { name: "International Crisis Group", url: "https://www.crisisgroup.org/rss.xml" },
    { name: "BBC Africa", url: "https://feeds.bbci.co.uk/news/world/africa/rss.xml" },
    { name: "BBC Middle East", url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml" },
    { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
    { name: "UN OCHA (Humanitarian)", url: "https://www.unocha.org/rss.xml" },
    { name: "BBC World News", url: "https://feeds.bbci.co.uk/news/world/rss.xml" }
  ];

  for (const source of rssSources) {
    try {
      const { raw, events } = await fetchRssEvents(source);
      liveEvents.push(...events);
      statuses.push(sourceStatus(source.name, "conflict", now, { status: raw ? "up" : "empty", items: events.length, rawItems: raw }));
    } catch (error) {
      console.error(`${source.name}: ${error.message}`);
      statuses.push(sourceStatus(source.name, "conflict", now, { status: "failed", error: error.message }));
    }
  }

  // Mode: "live" = this run ingested live items; "stale" = this run got nothing, previous live data kept;
  // "curated" = no live data has ever been available, curated watch areas shown instead.
  const previous = await readJson("data/conflict-feed.json");
  let feed;
  if (liveEvents.length) {
    const events = groupSignals(liveEvents);
    feed = { mode: "live", generatedAt: now, checkedAt: now, lastLiveAt: now, statusLabel: "Live public feeds", liveItemCount: liveEvents.length, events };
  } else if (previous && ["live", "stale"].includes(previous.mode) && previous.lastLiveAt && Array.isArray(previous.events) && previous.events.length) {
    feed = { ...previous, mode: "stale", checkedAt: now, statusLabel: `Live feeds unavailable; showing last live data (${ageText(previous.lastLiveAt, now)} old)` };
  } else {
    feed = { mode: "curated", generatedAt: now, checkedAt: now, lastLiveAt: null, statusLabel: "Curated watch areas, live feeds currently unavailable", liveItemCount: 0, events: fallbackEvents.slice(0, 40) };
  }
  feed.source = statuses.filter(s => s.status === "up" && s.items).map(s => s.name).join(", ") || (feed.mode === "curated" ? "Curated fallback" : feed.source || "");
  feed.sourceStatus = statuses;

  await mkdir("data", { recursive: true });
  await writeFile("data/conflict-feed.json", `${JSON.stringify(feed, null, 2)}\n`);
  console.log(`Conflict feed: mode=${feed.mode}, ${feed.events.length} signals from ${liveEvents.length} live items`);

  const newsSources = [
    { name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
    { name: "BBC", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    { name: "UN News", url: "https://news.un.org/feed/subscribe/en/news/topic/peace-and-security/feed/rss.xml" }
  ];
  const newsItems = [];
  const newsStatuses = [];
  for (const source of newsSources) {
    try {
      const { raw, items } = await fetchRssNews(source);
      newsItems.push(...items);
      newsStatuses.push(sourceStatus(source.name, "news", now, { status: raw ? "up" : "empty", items: items.length, rawItems: raw }));
    } catch (error) {
      console.error(`${source.name} news: ${error.message}`);
      newsStatuses.push(sourceStatus(source.name, "news", now, { status: "failed", error: error.message }));
    }
  }

  const previousNews = await readJson("data/news-feed.json");
  let newsFeed;
  if (newsItems.length) {
    newsFeed = {
      mode: "live",
      generatedAt: now,
      checkedAt: now,
      lastLiveAt: now,
      sources: newsStatuses.filter(s => s.items).map(s => s.name),
      items: dedupeNews(newsItems).sort((a, b) => dateValue(b.publishedAt) - dateValue(a.publishedAt)).slice(0, 30)
    };
  } else if (previousNews?.lastLiveAt && Array.isArray(previousNews.items) && previousNews.items.length) {
    newsFeed = { ...previousNews, mode: "stale", checkedAt: now };
  } else {
    newsFeed = { mode: "unavailable", generatedAt: now, checkedAt: now, lastLiveAt: null, sources: [], items: [] };
  }
  newsFeed.sourceStatus = newsStatuses;

  await writeFile("data/news-feed.json", `${JSON.stringify(newsFeed, null, 2)}\n`);
  console.log(`News feed: mode=${newsFeed.mode}, ${newsFeed.items.length} items`);
  console.log("\nSource status:");
  for (const s of [...statuses, ...newsStatuses]) {
    console.log(`  [${s.kind}] ${s.name.padEnd(28)} ${s.status.padEnd(8)} items=${s.items}${s.rawItems != null ? ` (raw ${s.rawItems})` : ""}${s.error ? ` ${s.error}` : ""}`);
  }
}

await main();
