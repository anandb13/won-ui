// DEMO ONLY: keyword-based stand-in for the LLM drafting endpoint.
// Replace draftFromText() with a call like POST /api/ai/draft-allocations.
// The real endpoint should return the same shape: an array of
// { role, category, country, startMonth, count, months }, which the user reviews before applying.
import { REFERENCE_DATA } from "../data/reference.js";

let n = 0;
const row = (role, category, count, months) => ({
  id: `d${Date.now()}_${n++}`,
  role,
  category,
  country: "India",
  startMonth: REFERENCE_DATA.calendar[0].month,
  count,
  months,
});

export function draftFromText(text) {
  const t = text.toLowerCase();
  const m = t.match(/(\d+)\s*(?:month|months|mo)\b/);
  const months = m ? Math.min(Math.max(parseInt(m[1], 10), 1), 36) : 6;
  const small = /\b(small|poc|pilot|prototype)\b/.test(t);
  const scale = (c) => (small ? Math.max(1, Math.ceil(c / 2)) : c);

  const rows = [
    row("Project Manager", "CONS", 1, months),
    row("Solution Architect", "CONS", 1, Math.max(1, Math.ceil(months / 2))),
    row("Senior Engineer", "AST", scale(2), months),
    row("Engineer", "ASE", scale(3), months),
    row("Associate Engineer", "TRAINEE", scale(2), months),
    row("QA Engineer", "ASE", 1, Math.max(1, months - 1)),
  ];
  if (/mobile|android|ios/.test(t)) rows.push(row("Mobile Engineer", "ITA", scale(2), months));
  if (/data|analytics|\bml\b|\bai\b/.test(t)) rows.push(row("Data Engineer", "ITA", scale(2), months));
  if (/cloud|devops|infra/.test(t)) rows.push(row("DevOps Engineer", "ITA", 1, months));
  return rows;
}
