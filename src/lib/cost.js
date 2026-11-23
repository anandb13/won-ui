// Cost engine (client-side placeholder).
// Later this moves to FastAPI; the UI will call it and only display the result.

export const inr = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

export const STATUSES = ["Draft", "Submitted", "Approved", "Closed"];

const LEGACY_CATEGORIES = {
  G1: "TRAINEE",
  G2: "ASE",
  G3: "ITA",
  G4: "AST",
  G5: "CONS",
};

export function categoryFor(allocation) {
  return allocation.category || LEGACY_CATEGORIES[allocation.grade] || allocation.grade;
}

export function lineCost(allocation, pricing) {
  const count = Math.max(1, Number(allocation.count) || 1);
  const duration = Number(allocation.months) || 0;

  if (!pricing.dailyRates || !pricing.calendar) {
    return (pricing[allocation.grade] || 0) * count * duration;
  }

  const category = categoryFor(allocation);
  const country = allocation.country || "India";
  const startIndex = pricing.calendar.findIndex((month) => month.month === allocation.startMonth);
  if (startIndex < 0) return 0;

  let cost = 0;
  for (let offset = 0; offset < duration; offset += 1) {
    const month = pricing.calendar[startIndex + offset];
    if (!month) break;
    const fraction = Math.min(1, duration - offset);
    const netWorkDays = month.workDays - (month.leaves[country] || 0);
    cost += (pricing.dailyRates[category]?.[country] || 0) * netWorkDays * fraction * count;
  }
  return cost;
}

export function summarize(allocations, pricing, contingencyPct = 0) {
  const byCategory = {};
  let subtotal = 0;
  let effort = 0; // person-months
  for (const allocation of allocations) {
    const c = lineCost(allocation, pricing);
    subtotal += c;
    const category = categoryFor(allocation);
    byCategory[category] = (byCategory[category] || 0) + c;
    const count = Math.max(1, Number(allocation.count) || 1);
    effort += count * (Number(allocation.months) || 0);
  }
  const contingency = (subtotal * (Number(contingencyPct) || 0)) / 100;
  return { subtotal, contingency, total: subtotal + contingency, byCategory, effort };
}

// Validation rules kept as data so they can later come from the database.
export const RULES = { maxContingencyPct: 20 };

export function validate(allocations, pricing, contingencyPct) {
  const msgs = [];
  if (allocations.length === 0) {
    msgs.push({ level: "error", text: "Add at least one allocation." });
    return msgs;
  }
  allocations.forEach((a, i) => {
    if (!a.role.trim())
      msgs.push({ level: "error", text: `Row ${i + 1}: role is empty.` });
    if (!(Number(a.months) > 0))
      msgs.push({ level: "error", text: `Row ${i + 1}: months must be above 0.` });
    if (a.country === "India" && !a.workLocation)
      msgs.push({ level: "error", text: `Row ${i + 1}: choose an Indian work location.` });
    if (pricing.calendar && !pricing.calendar.some((month) => month.month === a.startMonth))
      msgs.push({ level: "error", text: `Row ${i + 1}: choose a valid start month.` });
    if (pricing.calendar) {
      const startIndex = pricing.calendar.findIndex((month) => month.month === a.startMonth);
      if (startIndex >= 0 && startIndex + Number(a.months) > pricing.calendar.length)
        msgs.push({ level: "error", text: `Row ${i + 1}: duration extends beyond the available work calendar.` });
    }
  });
  if (Number(contingencyPct) > RULES.maxContingencyPct)
    msgs.push({
      level: "warn",
      text: `Contingency is above ${RULES.maxContingencyPct}%.`,
    });
  return msgs;
}
