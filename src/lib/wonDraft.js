// The WON draft collected through the AI chat, and the rules for what is still missing.
// These rules decide when the chat may build the WON. The model does not decide that.
// backend/ai_chat.py mirrors them so the model is told what to ask for.

export const emptyDraft = () => ({
  name: "",
  referenceWonNumber: "",
  contractId: "",
  contractValue: "",
  contractValueCurrency: "INR",
  startMonth: "",
  endMonth: "",
  rows: [],
  skipped: [], // optional fields the user chose not to provide
});

export const OPTIONAL_FIELDS = [
  { key: "contractId", label: "Contract ID" },
  { key: "contractValue", label: "Contract value" },
  { key: "referenceWonNumber", label: "Reference WON number" },
];

const monthIndex = (ctx, m) => ctx.months.indexOf(m);

export function normalizeRows(rows, ctx) {
  if (!Array.isArray(rows)) return [];
  const cats = new Set(ctx.categories.map((c) => c.id));
  const countries = new Set(ctx.countries);
  const locations = new Set(ctx.indiaLocations);
  const units = new Set(ctx.businessUnits);
  return rows.flatMap((r) => {
    if (!r || typeof r.role !== "string" || !r.role.trim() || !cats.has(String(r.category).toUpperCase())) {
      return [];
    }
    const country = countries.has(r.country) ? r.country : "India";
    const count = Math.min(Math.max(Math.round(Number(r.count)) || 1, 1), 100);
    const startMonth = ctx.months?.includes(r.startMonth) ? r.startMonth : "";
    const months = Math.max(1, Math.ceil(Number(r.months) || 1));
    const base = {
      role: r.role.trim().slice(0, 80),
      category: String(r.category).toUpperCase(),
      country,
      workLocation: country === "India" && locations.has(r.workLocation) ? r.workLocation : "",
      businessUnit: units.has(r.businessUnit) ? r.businessUnit : "",
      ...(startMonth ? { startMonth, months } : {}),
      count: 1,
    };
    return Array.from({ length: count }, () => ({ ...base }));
  });
}

// Clamp a draft (from the model or the mock) to values the app supports.
export function normalizeDraft(d, ctx) {
  const text = (v) => (typeof v === "string" ? v.trim().slice(0, 120) : "");
  const base = emptyDraft();
  let start = monthIndex(ctx, d?.startMonth) >= 0 ? d.startMonth : "";
  let end = monthIndex(ctx, d?.endMonth) >= 0 ? d.endMonth : "";
  if (start && end && monthIndex(ctx, end) < monthIndex(ctx, start)) end = "";
  const value = d?.contractValue === "" || d?.contractValue == null ? "" : Number(d.contractValue);
  return {
    ...base,
    name: text(d?.name),
    referenceWonNumber: text(d?.referenceWonNumber),
    contractId: text(d?.contractId),
    contractValue: Number.isFinite(value) && value >= 0 ? value : "",
    contractValueCurrency: ctx.currencies.includes(d?.contractValueCurrency)
      ? d.contractValueCurrency
      : "INR",
    startMonth: start,
    endMonth: end,
    rows: normalizeRows(d?.rows, ctx),
    skipped: Array.isArray(d?.skipped)
      ? d.skipped.filter((k) => OPTIONAL_FIELDS.some((f) => f.key === k))
      : [],
  };
}

// patch: only the keys the user just gave or changed. rows, if present, is the COMPLETE team.
export function mergePatch(draft, patch, ctx) {
  const merged = { ...draft };
  for (const k of Object.keys(emptyDraft())) {
    if (patch[k] === undefined) continue;
    merged[k] = k === "skipped" ? [...new Set([...draft.skipped, ...patch.skipped])] : patch[k];
  }
  return normalizeDraft(merged, ctx);
}

// Returns [{ key, label, required }]. Required items block building the WON.
export function missingInputs(d) {
  const out = [];
  if (!d.name) out.push({ key: "name", label: "WON name", required: true });
  if (!d.startMonth || !d.endMonth)
    out.push({ key: "dates", label: "Start and end date", required: true });
  if (d.rows.length === 0)
    out.push({ key: "rows", label: "Team: roles, grade, country", required: true });
  const noLoc = d.rows.filter((r) => r.country === "India" && !r.workLocation);
  if (noLoc.length)
    out.push({
      key: "workLocation",
      label: `Indian work location for: ${noLoc.map((r) => r.role).join(", ")}`,
      required: true,
    });
  for (const f of OPTIONAL_FIELDS) {
    const empty = d[f.key] === "" || d[f.key] == null;
    if (empty && !d.skipped.includes(f.key)) out.push({ ...f, required: false });
  }
  return out;
}

export const isReady = (d) => !missingInputs(d).some((m) => m.required);

export function monthCount(ctx, d) {
  if (!d.startMonth || !d.endMonth) return 0;
  return monthIndex(ctx, d.endMonth) - monthIndex(ctx, d.startMonth) + 1;
}
