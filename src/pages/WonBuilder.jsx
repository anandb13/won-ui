import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store.jsx";
import { STATUSES, inr, lineCost, summarize, validate } from "../lib/cost.js";
import AiAssist from "../components/AiAssist.jsx";

let rowSeq = 0;
const blankRow = () => ({
  id: `r${Date.now()}_${rowSeq++}`,
  role: "",
  grade: "G2",
  count: 1,
  months: 1,
});

// Wrapper so the form fully resets when switching between WONs.
export default function WonBuilder() {
  const { id } = useParams();
  return <Builder key={id} id={id} />;
}

function Builder({ id }) {
  const { wons, rates, rateMap, saveWon } = useStore();
  const navigate = useNavigate();
  const existing = id === "new" ? null : wons.find((w) => w.id === id);

  const [form, setForm] = useState(() =>
    existing
      ? {
          id: existing.id,
          title: existing.title,
          client: existing.client,
          status: existing.status,
          contingencyPct: existing.contingencyPct,
          allocations: JSON.parse(
            JSON.stringify(existing.versions[existing.versions.length - 1].allocations)
          ),
        }
      : {
          id: null,
          title: "",
          client: "",
          status: "Draft",
          contingencyPct: 10,
          allocations: [blankRow()],
        }
  );
  const [notice, setNotice] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const totals = useMemo(
    () => summarize(form.allocations, rateMap, form.contingencyPct),
    [form.allocations, form.contingencyPct, rateMap]
  );
  const issues = useMemo(
    () => validate(form.allocations, rateMap, form.contingencyPct),
    [form.allocations, form.contingencyPct, rateMap]
  );

  if (id !== "new" && !existing) {
    return (
      <div>
        <h1>Work order not found</h1>
        <Link to="/won">Back to work orders</Link>
      </div>
    );
  }

  const set = (patch) => {
    setNotice("");
    setForm((f) => ({ ...f, ...patch }));
  };
  const setRow = (rowId, patch) =>
    set({
      allocations: form.allocations.map((a) => (a.id === rowId ? { ...a, ...patch } : a)),
    });
  const addRow = () => set({ allocations: [...form.allocations, blankRow()] });
  const removeRow = (rowId) =>
    set({ allocations: form.allocations.filter((a) => a.id !== rowId) });

  function onSave() {
    const blocking = issues.filter((i) => i.level === "error");
    if (!form.title.trim()) {
      setShowErrors(true);
      return;
    }
    if (blocking.length) {
      setShowErrors(true);
      return;
    }
    const savedId = saveWon(form);
    setShowErrors(false);
    if (!existing) {
      navigate(`/won/${savedId}`, { replace: true });
    } else {
      setNotice(`Saved as version ${existing.versions.length + 1}.`);
    }
  }

  const maxGradeCost = Math.max(1, ...Object.values(totals.byGrade));
  const hasErrors = issues.some((i) => i.level === "error");

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{existing ? existing.number : "New work order"}</h1>
          {existing && (
            <span className="muted">
              Current version v{existing.versions.length}. Saving creates v
              {existing.versions.length + 1}.
            </span>
          )}
          {!existing && <span className="muted">The WON number is issued when you save.</span>}
        </div>
        <div className="row-gap">
          <Link className="btn" to="/won">
            Cancel
          </Link>
          <button className="btn primary" onClick={onSave}>
            {existing ? "Save new version" : "Save WON"}
          </button>
        </div>
      </div>

      {notice && <div className="banner ok">{notice}</div>}
      {showErrors && !form.title.trim() && <div className="banner error">Enter a title.</div>}

      <div className="builder">
        <div className="builder-main">
          <div className="card pad">
            <div className="form-grid">
              <label>
                Title
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => set({ title: e.target.value })}
                  placeholder="Project or work title"
                />
              </label>
              <label>
                Client
                <input
                  className="input"
                  value={form.client}
                  onChange={(e) => set({ client: e.target.value })}
                />
              </label>
              <label>
                Status
                <select
                  className="input"
                  value={form.status}
                  onChange={(e) => set({ status: e.target.value })}
                >
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Contingency %
                <input
                  className="input"
                  type="number"
                  min="0"
                  max="100"
                  value={form.contingencyPct}
                  onChange={(e) => set({ contingencyPct: e.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="card pad">
            <div className="page-head tight">
              <h2>Grade allocation</h2>
              <button className="btn" onClick={addRow}>
                Add row
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Grade</th>
                    <th className="num">Headcount</th>
                    <th className="num">Months</th>
                    <th className="num">Cost</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {form.allocations.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <input
                          className="input"
                          value={a.role}
                          placeholder="e.g. Senior Engineer"
                          onChange={(e) => setRow(a.id, { role: e.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          className="input"
                          value={a.grade}
                          onChange={(e) => setRow(a.id, { grade: e.target.value })}
                        >
                          {rates.map((r) => (
                            <option key={r.grade} value={r.grade}>
                              {r.grade} · {r.title}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="num">
                        <input
                          className="input num-input"
                          type="number"
                          min="0"
                          value={a.count}
                          onChange={(e) => setRow(a.id, { count: e.target.value })}
                        />
                      </td>
                      <td className="num">
                        <input
                          className="input num-input"
                          type="number"
                          min="0"
                          step="0.5"
                          value={a.months}
                          onChange={(e) => setRow(a.id, { months: e.target.value })}
                        />
                      </td>
                      <td className="num">{inr(lineCost(a, rateMap))}</td>
                      <td>
                        <button
                          className="btn icon"
                          onClick={() => removeRow(a.id)}
                          aria-label="Remove row"
                          title="Remove row"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                  {form.allocations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="empty">
                        No rows. Add one, or use AI assist.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <AiAssist onApply={(rows) => set({ allocations: rows })} />

          {existing && (
            <div className="card pad">
              <h2>Version history</h2>
              <table>
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Saved</th>
                    <th className="num">Total</th>
                    <th className="num">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {existing.versions
                    .slice()
                    .reverse()
                    .map((v, i, arr) => {
                      const prev = arr[i + 1];
                      const diff = prev ? v.total - prev.total : null;
                      return (
                        <tr key={v.v}>
                          <td>v{v.v}</td>
                          <td>{new Date(v.savedAt).toLocaleString("en-IN")}</td>
                          <td className="num">{inr(v.total)}</td>
                          <td className="num">
                            {diff === null ? "-" : (diff >= 0 ? "+" : "-") + inr(Math.abs(diff))}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="builder-side">
          <div className="card pad sticky">
            <h2>Cost summary</h2>
            <dl className="summary">
              <div>
                <dt>Effort</dt>
                <dd>{totals.effort.toLocaleString("en-IN")} person-months</dd>
              </div>
              <div>
                <dt>Subtotal</dt>
                <dd>{inr(totals.subtotal)}</dd>
              </div>
              <div>
                <dt>Contingency ({Number(form.contingencyPct) || 0}%)</dt>
                <dd>{inr(totals.contingency)}</dd>
              </div>
              <div className="grand">
                <dt>Total</dt>
                <dd>{inr(totals.total)}</dd>
              </div>
            </dl>

            <h3>By grade</h3>
            <div className="bars">
              {rates.map((r) => {
                const v = totals.byGrade[r.grade] || 0;
                return (
                  <div className="bar-row" key={r.grade}>
                    <span className="bar-label">{r.grade}</span>
                    <span className="bar-track">
                      <span className="bar-fill" style={{ width: `${(v / maxGradeCost) * 100}%` }} />
                    </span>
                    <span className="bar-value">{inr(v)}</span>
                  </div>
                );
              })}
            </div>

            <h3>Checks</h3>
            {issues.length === 0 && <p className="muted small">All checks pass.</p>}
            <ul className="issues">
              {issues.map((i, idx) => (
                <li key={idx} className={i.level}>
                  {i.text}
                </li>
              ))}
            </ul>
            {hasErrors && showErrors && (
              <p className="small error-text">Fix the errors above before saving.</p>
            )}
            <p className="muted small">
              Priced at today's rate card. Saved versions keep their own rates.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
