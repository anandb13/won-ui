// CSV import/export for "Daily cost by category and country (INR)".
//
// File layout (same as the table on the Rate card page):
//   Category,Reference label,US,UK,Canada,India,Mexico,Brazil,Uruguay
//   ASE,"ASE (C1,C1Y)",16562,16634,15237,2680,8415,11322,10893
//
// Rules: categories and countries must already exist. Blank cells keep the current value.
// Columns and rows may be in any order, and "Reference label" is optional and ignored.
// If anything in the file is invalid, nothing is applied.

const MAX_RATE = 10_000_000;
const IGNORED_HEADERS = new Set(["reference label", "label", "title", "description", "name"]);

function detectDelimiter(text) {
  const first = text.split(/\r?\n/).find((l) => l.trim()) || "";
  let inQuotes = false;
  const counts = { ",": 0, ";": 0, "\t": 0 };
  for (const ch of first) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && ch in counts) counts[ch]++;
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : ",";
}

// Returns an array of records (arrays of strings). Handles quotes, escaped quotes, CRLF, BOM.
export function parseCsv(input) {
  const text = input.replace(/^﻿/, "");
  const delim = detectDelimiter(text);
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delim) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return { rows: rows.filter((r) => r.some((c) => c.trim() !== "")), delimiter: delim };
}

// "1,234" -> 1234, "₹ 16,562.50" -> 16562.5, "16562,5" (decimal comma) -> 16562.5
function parseNumber(raw) {
  let s = raw.trim().replace(/₹|INR|Rs\.?/gi, "").replace(/\s/g, "");
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
  else if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  return Number(s);
}

const norm = (s) => s.trim().toLowerCase();

export function parseRateCsv(text, rateCard) {
  const out = { changes: [], unchanged: 0, errors: [], warnings: [], recordsRead: 0 };
  const { rows } = parseCsv(text);
  if (rows.length < 2) {
    out.errors.push("The file needs a header row and at least one data row.");
    return out;
  }

  const header = rows[0];
  const countryByName = new Map(rateCard.countries.map((c) => [norm(c), c]));
  let categoryCol = header.findIndex((h) => /^(category|grade|role)$/.test(norm(h)));
  if (categoryCol < 0) categoryCol = 0;

  const countryCols = []; // { col, country }
  const seen = new Set();
  header.forEach((h, col) => {
    if (col === categoryCol || !h.trim()) return;
    const country = countryByName.get(norm(h));
    if (country) {
      if (seen.has(country)) out.errors.push(`Column "${h.trim()}" appears more than once.`);
      seen.add(country);
      countryCols.push({ col, country });
    } else if (!IGNORED_HEADERS.has(norm(h))) {
      out.warnings.push(`Column "${h.trim()}" is not a known country and was ignored.`);
    }
  });
  if (countryCols.length === 0) {
    out.errors.push(`No country columns found. Expected headers such as: ${rateCard.countries.join(", ")}.`);
    return out;
  }

  const roleByKey = new Map();
  for (const r of rateCard.roles) {
    roleByKey.set(norm(r.id), r.id);
    roleByKey.set(norm(r.title), r.id);
  }

  const seenCategories = new Set();
  rows.slice(1).forEach((cells, i) => {
    const rowNo = i + 2; // as the user sees it, header is row 1
    out.recordsRead++;
    const rawCat = (cells[categoryCol] || "").trim();
    const category = roleByKey.get(norm(rawCat));
    if (!category) {
      out.errors.push(`Row ${rowNo}: category "${rawCat || "(empty)"}" is not in the rate card.`);
      return;
    }
    if (seenCategories.has(category)) {
      out.errors.push(`Row ${rowNo}: category ${category} appears more than once.`);
      return;
    }
    seenCategories.add(category);

    for (const { col, country } of countryCols) {
      const raw = cells[col];
      if (raw == null || raw.trim() === "") continue; // blank keeps the current value
      const value = parseNumber(raw);
      if (!Number.isFinite(value)) {
        out.errors.push(`Row ${rowNo}, ${country}: "${raw.trim()}" is not a number.`);
        continue;
      }
      if (value < 0) {
        out.errors.push(`Row ${rowNo}, ${country}: ${value} is negative.`);
        continue;
      }
      if (value > MAX_RATE) {
        out.errors.push(`Row ${rowNo}, ${country}: ${value} looks too large for a daily INR cost.`);
        continue;
      }
      const newRate = Math.round(value * 100) / 100;
      const oldRate = rateCard.dailyRates[category][country];
      if (newRate === oldRate) out.unchanged++;
      else out.changes.push({ category, country, oldRate, newRate });
    }
  });

  if (out.errors.length === 0 && out.changes.length === 0 && out.unchanged === 0) {
    out.errors.push("The file has no rate values.");
  }
  return out;
}

const q = (v) => (/[",\n\r]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

// Current rates as a CSV that can be edited and uploaded back.
export function ratesToCsv(rateCard) {
  const lines = [["Category", "Reference label", ...rateCard.countries].map(q).join(",")];
  for (const role of rateCard.roles) {
    lines.push(
      [role.id, role.title, ...rateCard.countries.map((c) => rateCard.dailyRates[role.id][c])]
        .map(q)
        .join(",")
    );
  }
  return lines.join("\r\n") + "\r\n";
}
