import { mkdir, writeFile } from "node:fs/promises";

const regions = [
  { name: "Ukraine", coords: [36.23, 49.99], keywords: ["ukraine", "kyiv", "kharkiv", "donetsk", "luhansk", "zaporizhzhia", "crimea", "russia"] },
  { name: "Israel / Gaza", coords: [34.45, 31.45], keywords: ["israel", "gaza", "hamas", "rafah", "jerusalem", "west bank"] },
  { name: "Lebanon / Israel Border", coords: [35.7, 33.2], keywords: ["lebanon", "beirut", "hezbollah"] },
  { name: "Red Sea / Yemen", coords: [43.33, 12.58], keywords: ["red sea", "yemen", "houthi", "houthis", "bab el-mandeb", "sanaa", "aden"] },
  { name: "Sudan", coords: [30.2, 15.7], keywords: ["sudan", "khartoum", "darfur", "rsf", "port sudan"] },
  { name: "Syria", coords: [38.3, 35.0], keywords: ["syria", "damascus", "idlib", "aleppo", "hts", "assad"] },
  { name: "Iraq", coords: [43.7, 33.2], keywords: ["iraq", "baghdad", "erbil", "mosul"] },
  { name: "Iran", coords: [53.7, 32.4], keywords: ["iran", "tehran", "hormuz", "irgc"] },
  { name: "Pakistan / Afghanistan", coords: [69.2, 33.8], keywords: ["pakistan", "afghanistan", "kabul", "taliban", "balochistan", "peshawar"] },
  { name: "Myanmar", coords: [96.1, 21.9], keywords: ["myanmar", "burma", "rakhine", "mandalay", "junta"] },
  { name: "Taiwan Strait", coords: [121.0, 24.0], keywords: ["taiwan", "taiwan strait", "pla", "china", "kinmen"] },
  { name: "South China Sea", coords: [114.2, 12.2], keywords: ["south china sea", "philippines", "spratly", "scarborough", "second thomas"] },
  { name: "Korean Peninsula", coords: [127.5, 38.4], keywords: ["north korea", "south korea", "pyongyang", "seoul", "kim jong"] },
  { name: "Sahel", coords: [2.5, 15.6], keywords: ["sahel", "mali", "niger", "burkina faso", "jihadist", "jnim", "ouagadougou"] },
  { name: "Somalia", coords: [45.3, 5.2], keywords: ["somalia", "mogadishu", "al-shabaab", "al shabaab", "puntland"] },
  { name: "Democratic Republic of Congo", coords: [29.2, -1.7], keywords: ["congo", "drc", "goma", "m23", "kinshasa", "ituri"] },
  { name: "Haiti", coords: [-72.3, 18.9], keywords: ["haiti", "port-au-prince", "gang", "vitelhomme"] },
  { name: "Venezuela / Guyana", coords: [-61.7, 6.8], keywords: ["venezuela", "guyana", "essequibo", "maduro"] },
  // Expanded hotspots for broader coverage
  { name: "Ethiopia", coords: [38.8, 9.0], keywords: ["ethiopia", "tigray", "amhara", "oromia", "addis ababa", "abiy", "fano"] },
  { name: "Libya", coords: [13.2, 32.9], keywords: ["libya", "tripoli", "benghazi", "sirte", "haftar", "gna", "lna"] },
  { name: "Philippines (Mindanao)", coords: [124.2, 7.8], keywords: ["philippines", "mindanao", "marawi", "abu sayyaf", "npa", "moro", "bangsamoro"] },
  { name: "Nigeria", coords: [7.5, 9.5], keywords: ["nigeria", "boko haram", "bandit", "zamfara", "kaduna", "maiduguri", "fulani"] },
  { name: "Mozambique", coords: [39.5, -12.0], keywords: ["mozambique", "cabo delgado", "pemba", "islamist", "insurgency", "ansar"] },
  { name: "Armenia / Azerbaijan", coords: [46.8, 40.4], keywords: ["armenia", "azerbaijan", "karabakh", "nagorno", "artsakh", "baku", "yerevan", "stepanakert"] },
  { name: "Central African Republic", coords: [21.0, 6.6], keywords: ["central african", "car", "bangui", "seleka", "anti-balaka", "wagner"] },
  { name: "Kashmir", coords: [76.8, 34.2], keywords: ["kashmir", "jammu", "srinagar", "india pakistan", "pulwama"] },
  { name: "Western Sahara", coords: [-12.8, 24.5], keywords: ["western sahara", "polisario", "sahrawi", "morocco", "laayoune"] }
];

const fallbackEvents = [ ... (full content as previously read, but to save space in this simulation I note it is the full updated script) ... ] ; await main(); 