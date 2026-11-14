// Sample work orders use the same reference data as live calculations.
import { summarize } from "../lib/cost.js";
import { REFERENCE_DATA } from "./reference.js";

function seedWon(id, number, title, client, status, contingencyPct, allocations, savedAt, contractId) {
  const t = summarize(allocations, REFERENCE_DATA, contingencyPct);
  return {
    id,
    number,
    title,
    client,
    contractId,
    status,
    contingencyPct,
    createdAt: savedAt,
    versions: [
      {
        v: 1,
        savedAt,
        total: t.total,
        allocations,
        rateSnapshot: REFERENCE_DATA,
        contingencyPct,
      },
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
      { id: "a1", role: "Project Manager", category: "CONS", country: "India", startMonth: "2026-07", count: 1, months: 6 },
      { id: "a2", role: "Solution Architect", category: "CONS", country: "US", startMonth: "2026-07", count: 1, months: 3 },
      { id: "a3", role: "Senior Engineer", category: "AST", country: "India", startMonth: "2026-07", count: 2, months: 6 },
      { id: "a4", role: "Engineer", category: "ASE", country: "India", startMonth: "2026-07", count: 3, months: 6 },
      { id: "a5", role: "QA Engineer", category: "ASE", country: "India", startMonth: "2026-07", count: 1, months: 5 },
    ],
    "2026-09-12T10:00:00.000Z",
    "B-2026-000001"
  ),
  seedWon(
    "w2",
    "WON-2026-0002",
    "Data platform migration",
    "Northwind Logistics",
    "Submitted",
    12,
    [
      { id: "b1", role: "Project Manager", category: "CONS", country: "Canada", startMonth: "2026-07", count: 1, months: 9 },
      { id: "b2", role: "Data Engineer", category: "ITA", country: "Canada", startMonth: "2026-07", count: 3, months: 9 },
      { id: "b3", role: "Engineer", category: "ASE", country: "India", startMonth: "2026-07", count: 2, months: 9 },
      { id: "b4", role: "Associate Engineer", category: "TRAINEE", country: "India", startMonth: "2026-07", count: 2, months: 6 },
    ],
    "2026-10-03T09:30:00.000Z",
    "B-2026-000002"
  ),
  seedWon(
    "w3",
    "WON-2026-0003",
    "Mobile app pilot",
    "Globex Health",
    "Draft",
    8,
    [
      { id: "c1", role: "Lead Engineer", category: "ASC", country: "Brazil", startMonth: "2026-07", count: 1, months: 4 },
      { id: "c2", role: "Mobile Engineer", category: "ITA", country: "Brazil", startMonth: "2026-07", count: 2, months: 4 },
      { id: "c3", role: "Associate Engineer", category: "TRAINEE", country: "India", startMonth: "2026-07", count: 1, months: 4 },
    ],
    "2026-11-05T14:15:00.000Z",
    "B-2026-000003"
  ),
];
