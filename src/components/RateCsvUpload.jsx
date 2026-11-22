import { useRef, useState } from "react";
import { parseRateCsv, ratesToCsv } from "../lib/rateCsv.js";

const MAX_BYTES = 1024 * 1024;
const MAX_SHOWN = 50;
const fmt = (n) => Number(n).toLocaleString("en-IN");

// Upload a CSV to update "Daily cost by category and country (INR)".
// Flow: choose file -> preview every change (nothing applied yet) -> Apply or Cancel.
export default function RateCsvUpload({ rateCard, onApply }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null); // { fileName, result }
  const [message, setMessage] = useState("");

  function download() {
    const blob = new Blob([ratesToCsv(rateCard)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "daily-cost-by-category-and-country.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be chosen again after a fix
    if (!file) return;
    setMessage("");
    if (file.size > MAX_BYTES) {
      setPreview({ fileName: file.name, result: { changes: [], unchanged: 0, warnings: [], errors: ["The file is larger than 1 MB."] } });
      return;
    }
    try {
      const text = await file.text();
      setPreview({ fileName: file.name, result: parseRateCsv(text, rateCard) });
    } catch {
      setPreview({ fileName: file.name, result: { changes: [], unchanged: 0, warnings: [], errors: ["The file could not be read."] } });
    }
  }

  function apply() {
    const { changes } = preview.result;
    onApply(changes);
    setMessage(
      `Updated ${changes.length} rate${changes.length === 1 ? "" : "s"} from ${preview.fileName}. Calculations for existing work orders now use the current reference values.`
    );
    setPreview(null);
  }

  const result = preview?.result;
  const blocked = !result || result.errors.length > 0 || result.changes.length === 0;

  return (
    <div className="card pad csv-upload">
      <div className="page-head tight">
        <h2>Update rates from CSV</h2>
        <div className="row-gap">
          <button className="btn" onClick={download}>
            Download current CSV
          </button>
          <button className="btn primary" onClick={() => inputRef.current?.click()}>
            Upload CSV
          </button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={onFile} aria-label="Upload rates CSV" />
        </div>
      </div>
      <p className="muted small">
        Columns: Category, then one column per country ({rateCard.countries.join(", ")}). Values are
        daily cost in INR. Blank cells keep the current value. Only existing categories and countries
        are accepted. Tip: download the current CSV, edit it, and upload it back.
      </p>

      <div aria-live="polite">
        {message && <p className="csv-ok small">{message}</p>}
        {result && (
          <div className="csv-preview">
            <p className="small">
              <strong>{preview.fileName}</strong>:{" "}
              {result.errors.length === 0
                ? `${result.changes.length} rate${result.changes.length === 1 ? "" : "s"} will change, ${result.unchanged} unchanged.`
                : "this file cannot be applied. Fix the problems below and upload it again."}
            </p>

            {result.errors.length > 0 && (
              <ul className="csv-errors small" role="alert">
                {result.errors.slice(0, 20).map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
                {result.errors.length > 20 && <li>and {result.errors.length - 20} more problems</li>}
              </ul>
            )}
            {result.warnings.length > 0 && (
              <ul className="csv-warnings small">
                {result.warnings.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}

            {result.errors.length === 0 && result.changes.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Country</th>
                      <th className="num">Current</th>
                      <th className="num">New</th>
                      <th className="num">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.changes.slice(0, MAX_SHOWN).map((c) => {
                      const pct = c.oldRate ? ((c.newRate - c.oldRate) / c.oldRate) * 100 : null;
                      return (
                        <tr key={c.category + c.country}>
                          <td>{c.category}</td>
                          <td>{c.country}</td>
                          <td className="num">{fmt(c.oldRate)}</td>
                          <td className="num">
                            <strong>{fmt(c.newRate)}</strong>
                          </td>
                          <td className="num">{pct == null ? "new" : `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {result.changes.length > MAX_SHOWN && (
                  <p className="muted small">and {result.changes.length - MAX_SHOWN} more changes</p>
                )}
              </div>
            )}

            <div className="row-gap">
              <button className="btn primary" disabled={blocked} onClick={apply}>
                Apply {result.changes.length || ""} change{result.changes.length === 1 ? "" : "s"}
              </button>
              <button className="btn" onClick={() => setPreview(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
