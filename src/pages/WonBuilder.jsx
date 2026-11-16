import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store.jsx";
import { categoryFor, inr, summarize, validate } from "../lib/cost.js";
import { BUSINESS_UNITS, INDIA_WORK_LOCATIONS, monthLabel } from "../data/reference.js";
import AiAssist from "../components/AiAssist.jsx";

let rowSeq = 0;
const blankRow = (startMonth = "2026-07", months = 1) => ({
  id: `r${Date.now()}_${rowSeq++}`,
  role: "",
  category: "ASE",
  country: "India",
  workLocation: "",
  businessUnit: "",
  startMonth,
  count: 1,
  months,
});

function datesFromAllocations(allocations, calendar) {
  const scheduled = allocations
    .map((allocation) => {
      const start = calendar.findIndex((month) => month.month === allocation.startMonth);
      if (start < 0) return null;
      return { start, end: start + Math.max(1, Math.ceil(Number(allocation.months) || 1)) - 1 };
    })
    .filter(Boolean);
  if (!scheduled.length) return { startMonth: calendar[0].month, endMonth: calendar[0].month };
  const start = Math.min(...scheduled.map((item) => item.start));
  const end = Math.min(calendar.length - 1, Math.max(...scheduled.map((item) => item.end)));
  return { startMonth: calendar[start].month, endMonth: calendar[end].month };
}

// Wrapper so the form fully resets when switching between WONs.
export default function WonBuilder() {
  const { id } = useParams();
  return <Builder key={id} id={id} />;
}

function Builder({ id }) {
  const { wons, rateCard, saveWon } = useStore();
  const navigate = useNavigate();
  const existing = id === "new" ? null : wons.find((w) => w.id === id);
  const categories = rateCard.roles;
  const savedAllocations = existing
    ? JSON.parse(JSON.stringify(existing.versions[existing.versions.length - 1].allocations))
    : null;
  const initialDates = existing
    ? {
        ...datesFromAllocations(savedAllocations, rateCard.calendar),
        startMonth: existing.startMonth || datesFromAllocations(savedAllocations, rateCard.calendar).startMonth,
        endMonth: existing.endMonth || datesFromAllocations(savedAllocations, rateCard.calendar).endMonth,
      }
    : { startMonth: rateCard.calendar[0].month, endMonth: rateCard.calendar[0].month };
  const initialDuration =
    rateCard.calendar.findIndex((month) => month.month === initialDates.endMonth) -
      rateCard.calendar.findIndex((month) => month.month === initialDates.startMonth) +
    1;

  const [form, setForm] = useState(() =>
    existing
      ? {
          id: existing.id,
          name: existing.name || existing.title || "",
          referenceWonNumber: existing.referenceWonNumber || "",
          contractId: existing.contractId || "",
          contractValue: existing.contractValue ?? "",
          contractValueCurrency: existing.contractValueCurrency || "INR",
          ...initialDates,
          status: existing.status,
          allocations: savedAllocations.map((allocation) => ({
            ...allocation,
            category: categoryFor(allocation) || "ASE",
            country: allocation.country || "India",
            workLocation: allocation.workLocation || "",
            businessUnit: allocation.businessUnit || "",
            startMonth: allocation.startMonth || initialDates.startMonth,
          })),
        }
      : {
          id: null,
          name: "",
          referenceWonNumber: "",
          contractId: "",
          contractValue: "",
          contractValueCurrency: "INR",
          ...initialDates,
          status: "Draft",
          allocations: [blankRow(initialDates.startMonth, initialDuration)],
        }
  );
  const [showErrors, setShowErrors] = useState(false);

  const totals = useMemo(
    () => summarize(form.allocations, rateCard, 0),
    [form.allocations, rateCard]
  );
  const issues = useMemo(
    () => validate(form.allocations, rateCard, 0),
    [form.allocations, rateCard]
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
    setForm((f) => ({ ...f, ...patch }));
  };
  const setRow = (rowId, patch) =>
    set({
      allocations: form.allocations.map((a) => (a.id === rowId ? { ...a, ...patch } : a)),
    });
  const addRow = () => {
    const start = rateCard.calendar.findIndex((month) => month.month === form.startMonth);
    const end = rateCard.calendar.findIndex((month) => month.month === form.endMonth);
    set({ allocations: [...form.allocations, blankRow(form.startMonth, end - start + 1)] });
  };
  const removeRow = (rowId) =>
    set({ allocations: form.allocations.filter((a) => a.id !== rowId) });

  function setProjectMonth(field, value) {
    let startMonth = field === "startMonth" ? value : form.startMonth;
    let endMonth = field === "endMonth" ? value : form.endMonth;
    let startIndex = rateCard.calendar.findIndex((month) => month.month === startMonth);
    let endIndex = rateCard.calendar.findIndex((month) => month.month === endMonth);
    if (startIndex > endIndex) {
      if (field === "startMonth") {
        endMonth = startMonth;
        endIndex = startIndex;
      } else {
        startMonth = endMonth;
        startIndex = endIndex;
      }
    }
    const months = endIndex - startIndex + 1;
    set({
      startMonth,
      endMonth,
      allocations: form.allocations.map((allocation) => ({
        ...allocation,
        startMonth,
        months,
      })),
    });
  }

  function onSave() {
    const blocking = issues.filter((i) => i.level === "error");
    if (!form.name.trim()) {
      setShowErrors(true);
      return;
    }
    if (blocking.length) {
      setShowErrors(true);
      return;
    }
    saveWon(form);
    setShowErrors(false);
    navigate("/won", { replace: true });
  }

  const maxCategoryCost = Math.max(1, ...Object.values(totals.byCategory));
  const hasErrors = issues.some((i) => i.level === "error");

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{existing ? existing.number : "New work order"}</h1>
          {!existing && <span className="muted">The WON number is issued when you save.</span>}
        </div>
        <div className="row-gap">
          <Link className="btn" to="/won">
            Cancel
          </Link>
          <button className="btn primary" onClick={onSave}>
            {existing ? "Save changes" : "Create"}
          </button>
        </div>
      </div>

      {showErrors && !form.name.trim() && <div className="banner error">Enter a WON name.</div>}

      <div className="builder">
        <div className="builder-main">
          <div className="card pad">
            <div className="form-grid">
              <label>
                WON name
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  placeholder="Work order name"
                />
              </label>
              <label>
                Reference WON number
                <input
                  className="input"
                  value={form.referenceWonNumber}
                  onChange={(e) => set({ referenceWonNumber: e.target.value })}
                  placeholder="External reference"
                />
              </label>
              <label>
                Contract ID
                <input
                  className="input"
                  value={form.contractId}
                  onChange={(e) => set({ contractId: e.target.value })}
                  placeholder="Contract identifier"
                />
              </label>
              <label>
                Contract value
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1000"
                  value={form.contractValue}
                  onChange={(e) => set({ contractValue: e.target.value })}
                  placeholder="Contract value"
                />
              </label>
              <label>
                Contract value currency
                <select
                  className="input"
                  value={form.contractValueCurrency}
                  onChange={(e) => set({ contractValueCurrency: e.target.value })}
                >
                  {["INR", "USD", "CAD", "AUD", "GBP"].map((currency) => (
                    <option key={currency}>{currency}</option>
                  ))}
                </select>
              </label>
              <label>
                Start month
                <select
                  className="input"
                  value={form.startMonth}
                  onChange={(e) => setProjectMonth("startMonth", e.target.value)}
                >
                  {rateCard.calendar.map((month) => (
                    <option key={month.month} value={month.month}>{monthLabel(month.month)}</option>
                  ))}
                </select>
              </label>
              <label>
                End month
                <select
                  className="input"
                  value={form.endMonth}
                  onChange={(e) => setProjectMonth("endMonth", e.target.value)}
                >
                  {rateCard.calendar.map((month) => (
                    <option key={month.month} value={month.month}>{monthLabel(month.month)}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="card pad">
            <div className="page-head tight">
              <h2>Resource allocation</h2>
              <button className="btn" onClick={addRow}>
                Add row
              </button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Category</th>
                    <th>Country</th>
                    <th>Work location</th>
                    <th>Business Unit</th>
                    <th className="num">Headcount</th>
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
                          value={a.category}
                          onChange={(e) => setRow(a.id, { category: e.target.value })}
                        >
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.title}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          className="input"
                          value={a.country}
                          onChange={(e) => setRow(a.id, { country: e.target.value, workLocation: "" })}
                        >
                          {rateCard.countries.map((country) => (
                            <option key={country}>{country}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {a.country === "India" && (
                          <select
                            className="input"
                            value={a.workLocation}
                            aria-label={`Work location for ${a.role || "allocation row"}`}
                            onChange={(e) => setRow(a.id, { workLocation: e.target.value })}
                          >
                            <option value="">Choose work location</option>
                            {INDIA_WORK_LOCATIONS.map((location) => (
                              <option key={location}>{location}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td>
                        <select
                          className="input"
                          value={a.businessUnit}
                          aria-label={`Business Unit for ${a.role || "allocation row"}`}
                          onChange={(e) => setRow(a.id, { businessUnit: e.target.value })}
                        >
                          <option value="">Select Business Unit</option>
                          {BUSINESS_UNITS.map((businessUnit) => (
                            <option key={businessUnit}>{businessUnit}</option>
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
                        <td colSpan={7} className="empty">
                        No rows. Add one, or use AI assist.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <AiAssist
            onApply={(rows) => {
              const start = rateCard.calendar.findIndex((month) => month.month === form.startMonth);
              const end = rateCard.calendar.findIndex((month) => month.month === form.endMonth);
              set({
                allocations: rows.map((row) => ({
                  ...row,
                  startMonth: form.startMonth,
                  months: end - start + 1,
                })),
              });
            }}
          />

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
              <div className="grand">
                <dt>Total</dt>
                <dd>{inr(totals.total)}</dd>
              </div>
            </dl>

            <h3>By category</h3>
            <div className="bars">
              {categories.map((category) => {
                const v = totals.byCategory[category.id] || 0;
                return (
                  <div className="bar-row" key={category.id}>
                    <span className="bar-label">{category.id}</span>
                    <span className="bar-track">
                      <span className="bar-fill" style={{ width: `${(v / maxCategoryCost) * 100}%` }} />
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
              Priced using the current country rates and work calendar. Saved versions keep their own inputs.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
