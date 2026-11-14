// SAMPLE DATA ONLY. Replace with your real grade-cost data (via the API later).
import { summarize } from "../lib/cost.js";

export const SEED_RATES = [
  { grade: "G1", title: "Associate", rate: 60000, effectiveFrom: "2026-04-01" },
  { grade: "G2", title: "Engineer", rate: 95000, effectiveFrom: "2026-04-01" },
  { grade: "G3", title: "Senior Engineer", rate: 140000, effectiveFrom: "2026-04-01" },
  { grade: "G4", title: "Lead", rate: 190000, effectiveFrom: "2026-04-01" },
  { grade: "G5", title: "Architect", rate: 250000, effectiveFrom: "2026-04-01" },
];

const rateMap = Object.fromEntries(SEED_RATES.map((r) => [r.grade, r.rate]));

function seedWon(id, number, title, client, status, contingencyPct, allocations, savedAt) {
  const t = summarize(allocations, rateMap, contingencyPct);
  return {
    id,
    number,
    title,
    client,
    status,
    contingencyPct,
    createdAt: savedAt,
    versions: [
      { v: 1, savedAt, total: t.total, allocations, rateSnapshot: rateMap, contingencyPct },
    ],
  };
}

export const SEED_WONS = [
  seedWon(
    "w1",
    "WON-2026-0001",
    "Customer portal revamp",
    "Acme Retail",
    "Approved",
    10,
    [
      { id: "a1", role: "Project Manager", grade: "G4", count: 1, months: 6 },
      { id: "a2", role: "Solution Architect", grade: "G5", count: 1, months: 3 },
      { id: "a3", role: "Senior Engineer", grade: "G3", count: 2, months: 6 },
      { id: "a4", role: "Engineer", grade: "G2", count: 3, months: 6 },
      { id: "a5", role: "QA Engineer", grade: "G2", count: 1, months: 5 },
    ],
    "2026-09-12T10:00:00.000Z"
  ),
  seedWon(
    "w2",
    "WON-2026-0002",
    "Data platform migration",
    "Northwind Logistics",
    "Submitted",
    12,
    [
      { id: "b1", role: "Project Manager", grade: "G4", count: 1, months: 9 },
      { id: "b2", role: "Data Engineer", grade: "G3", count: 3, months: 9 },
      { id: "b3", role: "Engineer", grade: "G2", count: 2, months: 9 },
      { id: "b4", role: "Associate Engineer", grade: "G1", count: 2, months: 6 },
    ],
    "2026-10-03T09:30:00.000Z"
  ),
  seedWon(
    "w3",
    "WON-2026-0003",
    "Mobile app pilot",
    "Globex Health",
    "Draft",
    8,
    [
      { id: "c1", role: "Lead Engineer", grade: "G4", count: 1, months: 4 },
      { id: "c2", role: "Mobile Engineer", grade: "G3", count: 2, months: 4 },
      { id: "c3", role: "Associate Engineer", grade: "G1", count: 1, months: 4 },
    ],
    "2026-11-05T14:15:00.000Z"
  ),
];
