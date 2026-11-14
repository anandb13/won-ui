// Cost engine (client-side placeholder).
// Later this moves to FastAPI; the UI will call it and only display the result.

export const inr = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

export const STATUSES = ["Draft", "Submitted", "Approved", "Closed"];

export function lineCost(a, rateMap) {
  return (
    (rateMap[a.grade] || 0) * (Number(a.count) || 0) * (Number(a.months) || 0)
  );
}

export function summarize(allocations, rateMap, contingencyPct = 0) {
  const byGrade = {};
  let subtotal = 0;
  let effort = 0; // person-months
  for (const a of allocations) {
    const c = lineCost(a, rateMap);
    subtotal += c;
    byGrade[a.grade] = (byGrade[a.grade] || 0) + c;
    effort += (Number(a.count) || 0) * (Number(a.months) || 0);
  }
  const contingency = (subtotal * (Number(contingencyPct) || 0)) / 100;
  return { subtotal, contingency, total: subtotal + contingency, byGrade, effort };
}

// Validation rules kept as data so they can later come from the database.
export const RULES = {
  maxSeniorCostShare: 0.4, // G4 + G5 share of subtotal
  seniorGrades: ["G4", "G5"],
  maxContingencyPct: 20,
};

export function validate(allocations, rateMap, contingencyPct) {
  const msgs = [];
  if (allocations.length === 0) {
    msgs.push({ level: "error", text: "Add at least one allocation." });
    return msgs;
  }
  allocations.forEach((a, i) => {
    if (!a.role.trim())
      msgs.push({ level: "error", text: `Row ${i + 1}: role is empty.` });
    if (!(Number(a.count) > 0))
      msgs.push({ level: "error", text: `Row ${i + 1}: headcount must be above 0.` });
    if (!(Number(a.months) > 0))
      msgs.push({ level: "error", text: `Row ${i + 1}: months must be above 0.` });
  });
  const s = summarize(allocations, rateMap, contingencyPct);
  if (s.subtotal > 0) {
    const senior = RULES.seniorGrades.reduce((t, g) => t + (s.byGrade[g] || 0), 0);
    const share = senior / s.subtotal;
    if (share > RULES.maxSeniorCostShare)
      msgs.push({
        level: "warn",
        text: `Senior grades (${RULES.seniorGrades.join(", ")}) are ${Math.round(
          share * 100
        )}% of cost; the limit is ${Math.round(RULES.maxSeniorCostShare * 100)}%.`,
      });
  }
  if (Number(contingencyPct) > RULES.maxContingencyPct)
    msgs.push({
      level: "warn",
      text: `Contingency is above ${RULES.maxContingencyPct}%.`,
    });
  return msgs;
}
