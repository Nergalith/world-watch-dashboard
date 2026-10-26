// Country tagging and scoring for the World Watch country view.
// Pure functions (no network, no file access) so they can be unit-tested with node.

// id = Natural Earth ADM0_A3 code (matches data/countries.geojson). Aliases are matched
// case-insensitively on word boundaries, longest first; a matched phrase is blanked so
// "South Sudan" does not also count as "Sudan" and "Papua New Guinea" not as "Guinea".
export const COUNTRY_ALIASES = {
  AFG: ["afghanistan", "afghan", "afghans", "kabul", "kandahar", "herat", "jalalabad"],
  ALB: ["albania", "albanian", "tirana"], DZA: ["algeria", "algerian", "algiers"],
  AGO: ["angola", "angolan", "luanda"], ARG: ["argentina", "argentine", "argentinian", "buenos aires", "milei"],
  ARM: ["armenia", "armenian", "yerevan"], AUS: ["australia", "australian", "canberra", "sydney", "melbourne"],
  AUT: ["austria", "austrian", "vienna"], AZE: ["azerbaijan", "azerbaijani", "baku"],
  BHS: ["bahamas"], BGD: ["bangladesh", "bangladeshi", "dhaka", "rohingya camp", "cox's bazar"],
  BLR: ["belarus", "belarusian", "minsk", "lukashenko"], BEL: ["belgium", "belgian", "brussels"],
  BLZ: ["belize"], BEN: ["benin", "beninese", "cotonou"], BTN: ["bhutan"],
  BOL: ["bolivia", "bolivian", "la paz"], BIH: ["bosnia", "bosnian", "sarajevo", "herzegovina"],
  BWA: ["botswana"], BRA: ["brazil", "brazilian", "brasilia", "rio de janeiro", "sao paulo", "são paulo", "lula", "bolsonaro"],
  BRN: ["brunei"], BGR: ["bulgaria", "bulgarian", "sofia"], BFA: ["burkina faso", "burkinabe", "ouagadougou"],
  BDI: ["burundi", "burundian", "bujumbura"], KHM: ["cambodia", "cambodian", "phnom penh"],
  CMR: ["cameroon", "cameroonian", "yaounde", "yaoundé"], CAN: ["canada", "canadian", "canadians", "ottawa", "toronto", "vancouver", "montreal"],
  CAF: ["central african republic", "bangui", "centrafrique"], TCD: ["n'djamena", "chadian"],
  CHL: ["chile", "chilean"], CHN: ["china", "chinese", "beijing", "xinjiang", "tibet", "shanghai", "hong kong", "xi jinping"],
  COL: ["colombia", "colombian", "bogota", "bogotá"], COD: ["democratic republic of congo", "democratic republic of the congo", "dr congo", "drc", "congo", "congolese", "kinshasa", "goma", "kivu", "m23", "ituri", "bukavu"],
  COG: ["republic of the congo", "congo-brazzaville", "brazzaville"], CRI: ["costa rica"],
  CIV: ["ivory coast", "côte d'ivoire", "cote d'ivoire", "ivorian", "abidjan"], HRV: ["croatia", "croatian", "zagreb"],
  CUB: ["cuba", "cuban", "havana"], CYP: ["cyprus", "cypriot", "nicosia"], CZE: ["czech", "czechia", "prague"],
  DNK: ["denmark", "danish", "copenhagen"], DJI: ["djibouti"], DOM: ["dominican republic", "santo domingo"],
  ECU: ["ecuador", "ecuadorian", "quito", "guayaquil"], EGY: ["egypt", "egyptian", "cairo", "sinai"],
  SLV: ["el salvador", "salvadoran", "bukele"], GNQ: ["equatorial guinea"], ERI: ["eritrea", "eritrean", "asmara"],
  EST: ["estonia", "estonian", "tallinn"], SWZ: ["eswatini", "swaziland"], ETH: ["ethiopia", "ethiopian", "addis ababa", "tigray", "amhara", "oromia"],
  FJI: ["fiji"], FIN: ["finland", "finnish", "helsinki"], FRA: ["france", "french", "paris", "macron"],
  GAB: ["gabon", "gabonese"], GMB: ["gambia", "gambian"], GEO: ["tbilisi", "georgian dream"],
  DEU: ["germany", "german", "berlin", "merz"], GHA: ["ghana", "ghanaian", "accra"], GRC: ["greece", "greek", "athens"],
  GRL: ["greenland"], GTM: ["guatemala", "guatemalan"], GIN: ["guinea", "conakry"], GNB: ["guinea-bissau", "guinea bissau"],
  GUY: ["guyana", "guyanese", "essequibo"], HTI: ["haiti", "haitian", "port-au-prince"], HND: ["honduras", "honduran", "tegucigalpa"],
  HUN: ["hungary", "hungarian", "budapest", "orban", "orbán"], ISL: ["iceland", "icelandic"],
  IND: ["india", "indian", "indians", "new delhi", "delhi", "mumbai", "modi", "manipur", "kolkata", "bengaluru", "chennai", "kashmir"],
  IDN: ["indonesia", "indonesian", "jakarta", "papua"], IRN: ["iran", "iranian", "iranians", "tehran", "khamenei", "irgc"],
  IRQ: ["iraq", "iraqi", "baghdad", "mosul", "erbil", "basra", "kurdistan region"], IRL: ["ireland", "irish", "dublin"],
  ISR: ["israel", "israeli", "israelis", "tel aviv", "netanyahu", "idf"], ITA: ["italy", "italian", "rome", "meloni"],
  JAM: ["jamaica", "jamaican"], JPN: ["japan", "japanese", "tokyo"], JOR: ["jordanian", "amman"],
  KAZ: ["kazakhstan", "kazakh", "astana", "almaty"], KEN: ["kenya", "kenyan", "nairobi", "mombasa"],
  KOS: ["kosovo", "pristina"], KWT: ["kuwait", "kuwaiti"], KGZ: ["kyrgyzstan", "kyrgyz", "bishkek"],
  LAO: ["laos", "lao", "vientiane"], LVA: ["latvia", "latvian", "riga"], LBN: ["lebanon", "lebanese", "beirut", "hezbollah"],
  LSO: ["lesotho"], LBR: ["liberia", "liberian", "monrovia"], LBY: ["libya", "libyan", "tripoli", "benghazi"],
  LTU: ["lithuania", "lithuanian", "vilnius"], LUX: ["luxembourg"], MKD: ["north macedonia", "macedonian", "skopje"],
  MDG: ["madagascar", "malagasy", "antananarivo"], MWI: ["malawi", "malawian", "lilongwe"], MYS: ["malaysia", "malaysian", "kuala lumpur"],
  MLI: ["mali", "malian", "bamako"], MRT: ["mauritania", "mauritanian", "nouakchott"], MEX: ["mexico", "mexican", "sinaloa", "jalisco", "sheinbaum"],
  MDA: ["moldova", "moldovan", "chisinau", "transnistria"], MNG: ["mongolia", "mongolian", "ulaanbaatar"], MNE: ["montenegro"],
  MAR: ["morocco", "moroccan", "rabat", "casablanca"], MOZ: ["mozambique", "mozambican", "maputo", "cabo delgado"],
  MMR: ["myanmar", "burma", "burmese", "yangon", "naypyidaw", "rakhine", "mandalay", "shan state"],
  NAM: ["namibia", "namibian", "windhoek"], NPL: ["nepal", "nepali", "nepalese", "kathmandu"], NLD: ["netherlands", "dutch", "amsterdam", "the hague"],
  NCL: ["new caledonia"], NZL: ["new zealand", "wellington", "auckland"], NIC: ["nicaragua", "nicaraguan", "managua"],
  NER: ["niger", "nigerien", "niamey"], NGA: ["nigeria", "nigerian", "nigerians", "abuja", "lagos", "borno", "boko haram", "zamfara", "kano"],
  PRK: ["north korea", "north korean", "pyongyang", "kim jong un"], NOR: ["norway", "norwegian", "oslo"], OMN: ["oman", "omani", "muscat"],
  PAK: ["pakistan", "pakistani", "pakistanis", "islamabad", "karachi", "lahore", "rawalpindi", "peshawar", "quetta", "balochistan", "baluchistan", "baloch",
        "khyber pakhtunkhwa", "khyber", "waziristan", "sindh", "gilgit", "multan", "faisalabad", "bannu", "dera ismail khan", "kurram", "tehreek-e-taliban",
        "ttp", "pti", "shehbaz", "imran khan", "azad kashmir", "kashmir"],
  PSX: ["palestine", "palestinian", "palestinians", "gaza", "west bank", "hamas", "ramallah", "rafah", "khan younis", "jenin"],
  PAN: ["panama", "panamanian"], PNG: ["papua new guinea"], PRY: ["paraguay", "paraguayan"], PER: ["peru", "peruvian", "lima"],
  PHL: ["philippines", "philippine", "filipino", "manila", "mindanao"], POL: ["poland", "polish", "warsaw"], PRT: ["portugal", "portuguese", "lisbon"],
  PRI: ["puerto rico"], QAT: ["qatar", "qatari", "doha"], ROU: ["romania", "romanian", "bucharest"],
  RUS: ["russia", "russian", "russians", "moscow", "kremlin", "putin", "kursk", "belgorod"], RWA: ["rwanda", "rwandan", "kigali"],
  SAU: ["saudi arabia", "saudi", "riyadh", "jeddah"], SEN: ["senegal", "senegalese", "dakar"], SRB: ["serbia", "serbian", "belgrade"],
  SLE: ["sierra leone"], SVK: ["slovakia", "slovak", "bratislava"], SVN: ["slovenia", "slovenian", "ljubljana"], SLB: ["solomon islands"],
  SOM: ["somalia", "somali", "mogadishu", "al-shabaab", "al shabaab", "puntland"], SOL: ["somaliland", "hargeisa"],
  ZAF: ["south africa", "south african", "johannesburg", "pretoria", "cape town"], KOR: ["south korea", "south korean", "seoul"],
  SDS: ["south sudan", "south sudanese", "juba"], ESP: ["spain", "spanish", "madrid", "barcelona"], LKA: ["sri lanka", "sri lankan", "colombo"],
  SDN: ["sudan", "sudanese", "khartoum", "darfur", "el fasher", "el-fasher", "rapid support forces", "rsf", "port sudan", "kordofan", "omdurman"],
  SUR: ["suriname"], SWE: ["sweden", "swedish", "stockholm"], CHE: ["switzerland", "swiss", "geneva", "zurich"],
  SYR: ["syria", "syrian", "syrians", "damascus", "aleppo", "idlib", "homs", "latakia"], TWN: ["taiwan", "taiwanese", "taipei"],
  TJK: ["tajikistan", "tajik", "dushanbe"], TZA: ["tanzania", "tanzanian", "dar es salaam", "dodoma"], THA: ["thailand", "thai", "bangkok"],
  TLS: ["timor-leste", "east timor"], TGO: ["togo", "togolese", "lome", "lomé"], TTO: ["trinidad"], TUN: ["tunisia", "tunisian", "tunis"],
  TUR: ["türkiye", "turkiye", "turkish", "ankara", "istanbul", "erdogan", "erdoğan"], TKM: ["turkmenistan"],
  UGA: ["uganda", "ugandan", "kampala"], UKR: ["ukraine", "ukrainian", "ukrainians", "kyiv", "kiev", "kharkiv", "odesa", "odessa", "donetsk", "luhansk",
        "zaporizhzhia", "kherson", "donbas", "crimea", "zelensky", "zelenskyy", "dnipro", "lviv", "pokrovsk"],
  ARE: ["united arab emirates", "uae", "emirati", "abu dhabi", "dubai"], GBR: ["united kingdom", "britain", "british", "uk", "london", "england", "scotland", "wales", "starmer"],
  USA: ["united states", "u.s.", "usa", "american", "americans", "washington", "white house", "pentagon", "trump", "new york", "california", "texas"],
  URY: ["uruguay", "uruguayan", "montevideo"], UZB: ["uzbekistan", "uzbek", "tashkent"], VUT: ["vanuatu"],
  VEN: ["venezuela", "venezuelan", "caracas", "maduro"], VNM: ["vietnam", "vietnamese", "hanoi", "ho chi minh"],
  SAH: ["western sahara", "polisario"], YEM: ["yemen", "yemeni", "houthi", "houthis", "sanaa", "aden"], ZMB: ["zambia", "zambian", "lusaka"],
  ZWE: ["zimbabwe", "zimbabwean", "harare"], FLK: ["falkland"], CYN: ["northern cyprus"], ATA: ["antarctica"]
};

// Names that collide with people, places or words elsewhere: matched case-sensitively and
// rejected when the surrounding text points elsewhere.
const GUARDED = [
  { id: "GEO", re: /\bGeorgia\b/, reject: /atlanta|\bga\b|u\.s\. state|georgia (governor|senate|senator|voters|democrat|republican|bulldogs)|state of georgia|georgia's (governor|senate)/i },
  { id: "JOR", re: /\bJordan\b(?!\s+(?!River|Valley)[A-Z][a-z]+)/, reject: /michael jordan|\bnba\b/i },
  { id: "TCD", re: /\bChad\b(?!\s+[A-Z][a-z]+)/, reject: null },
  { id: "TUR", re: /\bTurkey\b/, reject: /thanksgiving/i },
  { id: "USA", re: /\bUS\b/, reject: null },
  { id: "CAF", re: /\bCAR\b/, reject: null }
];

// Phrases blanked before matching so they do not create false country hits.
const NOISE = /indian ocean|new mexico|new england|new south wales|guinea pig|french fries|german shepherd|rome statute|washington post|new york times|dutch disease|paris agreement|paris climate|al jazeera english|american samoa|latin america|south america|north america|central america|panama canal|jordan river|west indies|holland/gi;

const ALIAS_MAP = new Map();
for (const [id, names] of Object.entries(COUNTRY_ALIASES)) {
  for (const name of names) ALIAS_MAP.set(name, [...(ALIAS_MAP.get(name) || []), id]); // e.g. "kashmir" -> India and Pakistan
}
const ALIAS_LIST = [...ALIAS_MAP].map(([name, ids]) => ({ ids, name })).sort((a, b) => b.name.length - a.name.length);

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const ALIAS_RES = ALIAS_LIST.map(({ ids, name }) => ({ ids, re: new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(name)}(?=$|[^\\p{L}\\p{N}])`, "giu") }));

export function tagCountries(text = "") {
  const found = new Set();
  const original = String(text);
  for (const g of GUARDED) {
    if (g.re.test(original) && !(g.reject && g.reject.test(original))) found.add(g.id);
  }
  let value = original.toLowerCase().replace(/[’`]/g, "'").replace(NOISE, " ");
  for (const { ids, re } of ALIAS_RES) {
    re.lastIndex = 0;
    if (re.test(value)) {
      ids.forEach(id => found.add(id));
      re.lastIndex = 0;
      value = value.replace(re, (m, pre) => pre + " ".repeat(m.length - pre.length));
    }
  }
  return [...found].sort();
}

const CONFLICT_RE = /\b(war|wars|wartime|armed|attacks?|attacked|airstrikes?|air strikes?|air raids?|shelling|shelled|bomb|bombs|bombing|bombed|bombardment|missiles?|drones?|militants?|insurgen\w*|rebels?|clash(?:es|ed)?|fighting|fighters|kill|killed|kills|killing|strikes? (?:on|in|against|hit)|troops|soldiers|military|army|ceasefire|cease-fire|truce|terror\w*|gunmen|gunfire|explosions?|blast|suicide bomber|offensive|siege|hostages?|massacre|jihadis\w*|militias?|invasion|invaded|shot dead|ambush\w*|firefight|casualties|warplanes?|artillery|frontline|front line|occupation|genocide|displaced|abducted|kidnapp\w*|insurgency|security forces|crossfire|grenade|ied|mortar)\b/i;

export function isConflictText(text = "") {
  return CONFLICT_RE.test(String(text));
}

// ─── Scoring ───────────────────────────────────────────────────────────────
// Severity is based on conflict-keyword reports per day over the window (up to 30 days).
// Using a per-day rate keeps the scale stable while the 30-day history is still filling up.
export const THRESHOLDS = { RED: 4, ORANGE: 1.5, YELLOW: 0.3 }; // conflict reports per day
export const WINDOW_DAYS = 30;
const DAY = 86400000;

export function severityForRate(rate, totalMentions) {
  if (!totalMentions) return "NONE";
  if (rate >= THRESHOLDS.RED) return "RED";
  if (rate >= THRESHOLDS.ORANGE) return "ORANGE";
  if (rate >= THRESHOLDS.YELLOW) return "YELLOW";
  return "GREEN";
}

export function trendFor(last7, prev7, coverageDays) {
  if (coverageDays < 14 || last7 + prev7 < 6) return "not enough data";
  const diff = last7 - prev7;
  if (diff >= 3 && last7 >= prev7 * 1.5) return "escalating";
  if (diff <= -3 && last7 <= prev7 / 1.5) return "cooling";
  return "steady";
}

// items: [{ title, url, source, date (ISO), countries: [id], conflict: bool }]
export function scoreCountries(items, { now = Date.now(), collectingSince = null, headlinesPerCountry = 15 } = {}) {
  const windowStart = now - WINDOW_DAYS * DAY;
  // Days we have been collecting. Feeds already carry roughly a week of back items on the first
  // run, so the per-day rate divides by (days collected + 7), capped at the window length.
  const sinceMs = collectingSince ? Date.parse(collectingSince) : now;
  const coverageDays = Math.max(0, (now - (Number.isFinite(sinceMs) ? sinceMs : now)) / DAY);
  const rateDays = Math.min(WINDOW_DAYS, coverageDays + 7);
  const by = new Map();
  for (const item of items) {
    const t = Date.parse(item.date);
    if (!Number.isFinite(t) || t < windowStart || t > now + DAY) continue;
    for (const id of item.countries || []) {
      if (!by.has(id)) by.set(id, { mentions: 0, conflict: 0, last7: 0, prev7: 0, last7Mentions: 0, headlines: [] });
      const c = by.get(id);
      c.mentions += 1;
      const age = now - t;
      if (age <= 7 * DAY) {
        c.last7Mentions += 1;
        c.headlines.push(item);
      }
      if (item.conflict) {
        c.conflict += 1;
        if (age <= 7 * DAY) c.last7 += 1;
        else if (age <= 14 * DAY) c.prev7 += 1;
      }
    }
  }
  const countries = {};
  for (const [id, c] of by) {
    const rate = c.conflict / rateDays;
    countries[id] = {
      severity: severityForRate(rate, c.mentions),
      trend: trendFor(c.last7, c.prev7, coverageDays),
      conflictReports: c.conflict,
      mentions: c.mentions,
      conflictLast7: c.last7,
      conflictPrev7: c.prev7,
      mentionsLast7: c.last7Mentions,
      perDay: Math.round(rate * 100) / 100,
      headlines: c.headlines
        .sort((a, b) => (b.conflict - a.conflict) || (Date.parse(b.date) - Date.parse(a.date)))
        .slice(0, headlinesPerCountry)
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
        .map(({ title, url, source, date, conflict }) => ({ title, url, source, date, conflict }))
    };
  }
  return { coverageDays: Math.round(coverageDays * 10) / 10, countries };
}

export function itemKey(item) {
  return (item.url || "").replace(/[?#].*$/, "") + "|" + String(item.title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Merge new items into the rolling window: dedupe by URL and normalised title, drop old, cap size.
export function mergeWindow(previous, incoming, { now = Date.now(), maxItems = 8000 } = {}) {
  const windowStart = now - WINDOW_DAYS * DAY;
  const seenUrl = new Set();
  const seenTitle = new Set();
  const out = [];
  for (const item of [...incoming, ...previous]) {
    const t = Date.parse(item.date);
    if (!Number.isFinite(t) || t < windowStart || t > now + DAY) continue;
    const url = (item.url || "").replace(/[?#].*$/, "");
    const title = String(item.title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (!title || (url && seenUrl.has(url)) || seenTitle.has(title)) continue;
    if (url) seenUrl.add(url);
    seenTitle.add(title);
    out.push(item);
  }
  return out.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, maxItems);
}
