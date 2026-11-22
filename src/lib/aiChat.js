// Client for the AI chat endpoint.
//
// POST {VITE_AI_API_URL}/api/ai/chat
//   request : { messages: [{ role: "user" | "assistant", content }], context, draft }
//   response: { reply: string, draft: WonDraft }
// The browser owns the draft. The server merges what the model learned this turn into it and
// returns the full draft. See src/lib/wonDraft.js for the draft shape and the "missing" rules.
//
// By default a local mock answers so the UI works without a backend.
import { draftFromText } from "./draft.js";
import { emptyDraft, mergePatch, missingInputs, normalizeDraft } from "./wonDraft.js";

// Demo mock is the default. Set VITE_AI_MOCK=false to call the backend (dev: Vite proxies /api).
// VITE_AI_API_URL is only needed when the API is on another origin.
const API_URL = import.meta.env.VITE_AI_API_URL || "";
export const AI_IS_MOCK = import.meta.env.VITE_AI_MOCK !== "false";

export async function sendChat({ messages, context, draft, signal }) {
  if (AI_IS_MOCK) return mockChat(messages, context, draft, signal);

  const res = await fetch(`${API_URL}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, context, draft }),
    signal,
  });
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json()).detail || "";
    } catch {
      /* ignore */
    }
    throw new Error(detail || `AI service returned ${res.status}`);
  }
  const data = await res.json();
  return { reply: String(data.reply || ""), draft: normalizeDraft(data.draft, context) };
}

// ---- Mock (no backend) ----------------------------------------------------
// Keyword based. It follows the same rules as the real flow: never invents a name, dates or an
// Indian location, asks for what is missing, then says the WON is ready to build.
const MONTH_NAMES = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function monthCodeFromName(name, year) {
  const mm = String(MONTH_NAMES.indexOf(String(name || "").slice(0, 3).toLowerCase()) + 1).padStart(2, "0");
  return mm === "00" || !year ? "" : `${year}-${mm}`;
}

function parseDates(text, ctx) {
  const t = text.toLowerCase();
  const range = text.match(
    /\bfrom\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(20\d\d)\s*to\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(20\d\d)\b/i
  );
  if (range) {
    const start = monthCodeFromName(range[1], range[2]);
    const end = monthCodeFromName(range[3], range[4]);
    if (ctx.months.includes(start) && ctx.months.includes(end) && ctx.months.indexOf(end) >= ctx.months.indexOf(start)) {
      return { startMonth: start, endMonth: end };
    }
  }
  const iso = t.match(/\b(20\d\d)-(\d\d)\b/);
  let start = iso && ctx.months.includes(iso[0]) ? iso[0] : "";
  if (!start) {
    const m = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*'?(20\d\d)?/);
    if (m) {
      const mm = String(MONTH_NAMES.indexOf(m[1]) + 1).padStart(2, "0");
      start = ctx.months.find((x) => (m[2] ? x === `${m[2]}-${mm}` : x.endsWith(`-${mm}`))) || "";
    }
  }
  const n = t.match(/(\d+)\s*(?:month|months|mo)\b/);
  const count = n ? Math.min(Math.max(parseInt(n[1], 10), 1), 36) : 0;
  if (!start || !count) return {};
  const end = ctx.months[ctx.months.indexOf(start) + count - 1];
  return end ? { startMonth: start, endMonth: end } : {};
}

function parseStructuredPrompt(text, ctx) {
  const patch = {};
  const name = text.match(/\b(?:Create a WON|WON)\s+named\s+(.+?),\s*(?:from\b|starting\b)/i);
  if (name) patch.name = name[1].trim();

  Object.assign(patch, parseDates(text, ctx));

  const skipped = [];
  if (/\bskip\b[^.]*\breference WON(?: number)?\b/i.test(text)) skipped.push("referenceWonNumber");
  else {
    const ref = text.match(/\breference WON(?: number)?\s+([A-Za-z0-9-]+)/i);
    if (ref) patch.referenceWonNumber = ref[1];
  }
  if (/\bskip\b[^.]*\bcontract ID\b/i.test(text)) skipped.push("contractId");
  else {
    const contract = text.match(/\bContract ID\s+([A-Za-z0-9-]+)/i);
    if (contract) patch.contractId = contract[1];
  }
  const value = text.match(/\bcontract value\s+([\d,]+(?:\.\d+)?)\s*([A-Z]{3})\b/i);
  if (value) {
    const amount = Number(String(value[1]).replace(/,/g, ""));
    if (Number.isFinite(amount)) {
      patch.contractValue = amount;
      if (ctx.currencies?.includes(value[2].toUpperCase())) patch.contractValueCurrency = value[2].toUpperCase();
    }
  }
  if (skipped.length) patch.skipped = skipped;

  const team = text.match(/\bTeam:\s*(.+?)(?:\.\s*(?:Contract ID|contract value|reference WON|skip\b)|$)/is);
  if (team) {
    const rows = [];
    const re = /(\d+)\s+(.+?)\s*\(([^)]+)\)/g;
    let m;
    while ((m = re.exec(team[1])) !== null) {
      const count = Math.min(Math.max(parseInt(m[1], 10) || 1, 1), 100);
      const role = m[2].trim().replace(/^and\s+/i, "");
      const parts = m[3].split(",").map((p) => p.trim()).filter(Boolean);
      if (parts.length < 3) continue;
      const category = String(parts[0]).toUpperCase();
      const country = parts[1];
      const businessUnit = parts[parts.length - 1];
      const workLocation = parts.length >= 4 ? parts.slice(2, -1).join(", ") : "";
      rows.push({
        role,
        category,
        country,
        workLocation: country === "India" ? workLocation : "",
        businessUnit,
        count,
      });
    }
    if (rows.length) patch.rows = rows;
  }
  return patch;
}

function mockTurn(text, ctx, draft) {
  const t = text.toLowerCase();
  const before = missingInputs(draft);
  const asked = before[0]; // what the last reply asked for
  const patch = {};

  if (/\b(skip|don'?t have|not available|n\/a|none)\b/.test(t)) {
    patch.skipped = before.filter((m) => !m.required).map((m) => m.key);
  }
  if (draft.rows.length === 0) {
    const structured = parseStructuredPrompt(text, ctx);
    const hasStructured =
      structured.name || structured.startMonth || structured.endMonth || (structured.rows && structured.rows.length);
    if (hasStructured) {
      Object.assign(patch, structured);
    } else if (text.trim().length >= 12) {
      patch.rows = draftFromText(text).map((r) => ({
        role: r.role,
        category: r.category,
        country: r.country,
        count: r.count,
      }));
      Object.assign(patch, parseDates(text, ctx));
    }
  } else {
    const structured = parseStructuredPrompt(text, ctx);
    if (structured.name) patch.name = structured.name;
    if (structured.startMonth) patch.startMonth = structured.startMonth;
    if (structured.endMonth) patch.endMonth = structured.endMonth;
    if (structured.contractId) patch.contractId = structured.contractId;
    if (structured.contractValue !== undefined) patch.contractValue = structured.contractValue;
    if (structured.contractValueCurrency) patch.contractValueCurrency = structured.contractValueCurrency;
    if (structured.referenceWonNumber) patch.referenceWonNumber = structured.referenceWonNumber;
    if (structured.skipped?.length) patch.skipped = structured.skipped;
    // India rows need a location the user has named.
    const loc = ctx.indiaLocations.find((l) => t.includes(l.toLowerCase()));
    if (loc && draft.rows.some((r) => r.country === "India" && !r.workLocation)) {
      patch.rows = draft.rows.map((r) =>
        r.country === "India" && !r.workLocation ? { ...r, workLocation: loc } : r
      );
    }
  }
  if (!patch.startMonth || !patch.endMonth) Object.assign(patch, parseDates(text, ctx));
  if (!draft.name && !patch.name && asked?.key === "name" && !patch.rows && text.trim().length <= 80) {
    patch.name = text.trim();
  }
  const contract = text.match(/\bcontract(?:\s*id)?\s*[:#-]?\s*([A-Za-z0-9-]{3,})/i);
  if (!patch.contractId && contract) patch.contractId = contract[1];

  const next = mergePatch(draft, patch, ctx);
  const missing = missingInputs(next);
  const required = missing.filter((m) => m.required);
  const optional = missing.filter((m) => !m.required);

  let reply;
  if (required.length) {
    reply =
      (patch.rows ? "I drafted a team from your description (demo mode). " : "") +
      "To build the WON I still need:\n" +
      required.map((m) => `- ${m.label}`).join("\n");
  } else if (optional.length && !patch.skipped) {
    reply =
      "That covers everything required. Optional details you can add now, or say \"skip\":\n" +
      optional.map((m) => `- ${m.label}`).join("\n");
  } else {
    reply = 'Everything needed is in. Review the draft below and press "Build WON".';
  }
  return { reply, draft: next };
}

function mockChat(messages, context, draft, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const last = messages[messages.length - 1]?.content || "";
      resolve(mockTurn(last, context, draft || emptyDraft()));
    }, 500);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}
