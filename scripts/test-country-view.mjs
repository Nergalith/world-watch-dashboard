// Small self-check for country tagging and scoring: node scripts/test-country-view.mjs
import assert from "node:assert/strict";
import { tagCountries, isConflictText, scoreCountries, mergeWindow, trendFor, severityForRate } from "./country-view.mjs";

const tags = [
  ["Militants attack police post in Bannu, Khyber Pakhtunkhwa", ["PAK"]],
  ["Karachi heatwave kills 12", ["PAK"]],
  ["South Sudan army clashes near Juba", ["SDS"]],
  ["Papua New Guinea floods", ["PNG"]],
  ["Georgia governor signs bill in Atlanta", []],
  ["Protests in Tbilisi as Georgia's ruling party wins", ["GEO"]],
  ["Michael Jordan buys team", []],
  ["Jordan says border closed", ["JOR"]],
  ["Israeli strikes on Gaza kill 20", ["ISR", "PSX"]],
  ["Kashmir tensions rise", ["IND", "PAK"]],
  ["Thanksgiving turkey prices", []],
  ["Indian Ocean cyclone", []],
  ["RSF fighters seize El Fasher", ["SDN"]],
  ["Drone attack on Kharkiv", ["UKR"]]
];
for (const [text, expected] of tags) assert.deepEqual(tagCountries(text), expected, text);
assert.equal(isConflictText("Six terrorists killed in DI Khan operation"), true);
assert.equal(isConflictText("Punjab CM opens water plants"), false);

assert.equal(severityForRate(0, 0), "NONE");
assert.equal(severityForRate(0, 3), "GREEN");
assert.equal(severityForRate(0.3, 3), "YELLOW");
assert.equal(severityForRate(1.5, 3), "ORANGE");
assert.equal(severityForRate(4, 3), "RED");
assert.equal(trendFor(10, 2, 20), "escalating");
assert.equal(trendFor(2, 10, 20), "cooling");
assert.equal(trendFor(5, 5, 20), "steady");
assert.equal(trendFor(10, 2, 5), "not enough data");

const now = Date.parse("2026-10-26T00:00:00Z");
const day = 86400000;
const items = [];
for (let i = 0; i < 40; i += 1) items.push({ title: `PK ${i}`, url: `https://x/${i}`, source: "T", date: new Date(now - (i % 20) * day).toISOString(), countries: ["PAK"], conflict: i % 2 === 0 });
items.push({ title: "old", url: "https://x/old", source: "T", date: new Date(now - 40 * day).toISOString(), countries: ["CAN"], conflict: true });
const merged = mergeWindow([], [...items, { ...items[0] }], { now });
assert.equal(merged.length, 40, "dedupe + drop items older than 30 days");
const { countries } = scoreCountries(merged, { now, collectingSince: new Date(now - 25 * day).toISOString() });
assert.equal(countries.PAK.conflictReports, 20);
assert.equal(countries.PAK.severity, "YELLOW"); // 20 / 30 days = 0.67 per day
assert.equal(countries.CAN, undefined, "out-of-window country stays grey");
assert.ok(countries.PAK.headlines.length <= 15);
console.log("country view tests passed");
