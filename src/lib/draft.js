// DEMO ONLY: keyword-based stand-in for the LLM drafting endpoint.
// Replace draftFromText() with a call like POST /api/ai/draft-allocations.
// The real endpoint should return the same shape: an array of
// { role, grade, count, months }, which the user reviews before applying.

let n = 0;
const row = (role, grade, count, months) => ({
  id: `d${Date.now()}_${n++}`,
  role,
  grade,
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
    row("Project Manager", "G4", 1, months),
    row("Solution Architect", "G5", 1, Math.max(1, Math.ceil(months / 2))),
    row("Senior Engineer", "G3", scale(2), months),
    row("Engineer", "G2", scale(3), months),
    row("Associate Engineer", "G1", scale(2), months),
    row("QA Engineer", "G2", 1, Math.max(1, months - 1)),
  ];
  if (/mobile|android|ios/.test(t)) rows.push(row("Mobile Engineer", "G3", scale(2), months));
  if (/data|analytics|\bml\b|\bai\b/.test(t)) rows.push(row("Data Engineer", "G3", scale(2), months));
  if (/cloud|devops|infra/.test(t)) rows.push(row("DevOps Engineer", "G3", 1, months));
  return rows;
}
