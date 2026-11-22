import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store.jsx";
import { categoryFor, validate } from "../lib/cost.js";
import { BUSINESS_UNITS, INDIA_WORK_LOCATIONS } from "../data/reference.js";
import WonBuilderAiAssist from "../components/WonBuilderAiAssist.jsx";

let rowSeq = 0;

function monthIndex(calendar, month) {
  return calendar.findIndex((item) => item.month === month);
}

function clampMonthIndex(calendar, index) {
  return Math.min(calendar.length - 1, Math.max(0, index));
}

function clampMonthToRange(calendar, month, rangeStart, rangeEnd) {
  const idx = monthIndex(calendar, month);
  const start = monthIndex(calendar, rangeStart);
  const end = monthIndex(calendar, rangeEnd);
  if (idx < 0 || start < 0 || end < 0) return rangeStart || calendar[0]?.month || month;
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  return calendar[Math.min(hi, Math.max(lo, idx))]?.month || rangeStart;
}

function monthsBetween(calendar, startMonth, endMonth) {
  const start = monthIndex(calendar, startMonth);
  const end = monthIndex(calendar, endMonth);
  if (start < 0 || end < 0) return 1;
  return Math.max(1, end - start + 1);
}

function endMonthFor(allocation, calendar) {
  const start = monthIndex(calendar, allocation.startMonth || calendar[0]?.month);
  if (start < 0) return calendar[0]?.month || "";
  const months = Math.max(1, Math.ceil(Number(allocation.months) || 1));
  return calendar[clampMonthIndex(calendar, start + months - 1)]?.month || allocation.startMonth || "";
}

function dateToMonth(value) {
  return typeof value === "string" && /^\d{4}-\d{2}/.test(value) ? value.slice(0, 7) : "";
}

function monthToStartDate(month) {
  return month ? `${month}-01` : "";
}

function monthToEndDate(month) {
  if (!month) return "";
  const [year, m] = month.split("-").map(Number);
  if (!year || !m) return "";
  const day = new Date(year, m, 0).getDate();
  return `${month}-${String(day).padStart(2, "0")}`;
}

function calendarDateBounds(calendar) {
  const start = calendar[0]?.month || "";
  const end = calendar[calendar.length - 1]?.month || start;
  return { min: monthToStartDate(start), max: monthToEndDate(end) };
}

function withAllocationDates(allocation, calendar, startMonth, endMonth) {
  return {
    ...allocation,
    startMonth,
    months: monthsBetween(calendar, startMonth, endMonth),
  };
}

function clampAllocationToProject(allocation, calendar, projectStart, projectEnd) {
  let startMonth = clampMonthToRange(calendar, allocation.startMonth || projectStart, projectStart, projectEnd);
  let endMonth = clampMonthToRange(calendar, endMonthFor(allocation, calendar), projectStart, projectEnd);
  if (monthIndex(calendar, endMonth) < monthIndex(calendar, startMonth)) endMonth = startMonth;
  return withAllocationDates(allocation, calendar, startMonth, endMonth);
}

const blankRow = (startMonth = "2026-07", endMonth = startMonth, calendar = [{ month: startMonth }]) => ({
  id: `r${Date.now()}_${rowSeq++}`,
  role: "",
  category: "ASE",
  country: "India",
  workLocation: "",
  businessUnit: "",
  startMonth,
  count: 1,
  months: monthsBetween(calendar, startMonth, endMonth),
});

function expandAllocations(allocations) {
  return allocations.flatMap((allocation) => {
    const count = Math.min(Math.max(Math.round(Number(allocation.count)) || 1, 1), 100);
    return Array.from({ length: count }, (_, i) => ({
      ...allocation,
      id: count === 1 ? allocation.id : `${allocation.id}_${i + 1}`,
      count: 1,
    }));
  });
}

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
          allocations: expandAllocations(
            savedAllocations.map((allocation) =>
              clampAllocationToProject(
                {
                  ...allocation,
                  category: categoryFor(allocation) || "ASE",
                  country: allocation.country || "India",
                  workLocation: allocation.workLocation || "",
                  businessUnit: allocation.businessUnit || "",
                  startMonth: allocation.startMonth || initialDates.startMonth,
                  months: Math.max(1, Math.ceil(Number(allocation.months) || initialDuration)),
                },
                rateCard.calendar,
                initialDates.startMonth,
                initialDates.endMonth
              )
            )
          ),
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
          allocations: [blankRow(initialDates.startMonth, initialDates.endMonth, rateCard.calendar)],
        }
  );
  const [showErrors, setShowErrors] = useState(false);

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
  const calendarBounds = useMemo(() => calendarDateBounds(rateCard.calendar), [rateCard.calendar]);
  const projectBounds = useMemo(
    () => ({
      min: monthToStartDate(form.startMonth),
      max: monthToEndDate(form.endMonth),
    }),
    [form.startMonth, form.endMonth]
  );

  const setAllocationMonth = (rowId, field, value) => {
    const monthValue = dateToMonth(value) || value;
    set({
      allocations: form.allocations.map((allocation) => {
        if (allocation.id !== rowId) return allocation;
        let startMonth = field === "startMonth" ? monthValue : allocation.startMonth;
        let endMonth = field === "endMonth" ? monthValue : endMonthFor(allocation, rateCard.calendar);
        startMonth = clampMonthToRange(rateCard.calendar, startMonth, form.startMonth, form.endMonth);
        endMonth = clampMonthToRange(rateCard.calendar, endMonth, form.startMonth, form.endMonth);
        let startIndex = monthIndex(rateCard.calendar, startMonth);
        let endIndex = monthIndex(rateCard.calendar, endMonth);
        if (startIndex < 0 || endIndex < 0) return allocation;
        if (startIndex > endIndex) {
          if (field === "startMonth") {
            endMonth = startMonth;
          } else {
            startMonth = endMonth;
          }
        }
        return withAllocationDates(allocation, rateCard.calendar, startMonth, endMonth);
      }),
    });
  };
  const addRow = () => {
    set({
      allocations: [
        ...form.allocations,
        blankRow(form.startMonth, form.endMonth, rateCard.calendar),
      ],
    });
  };
  const removeRow = (rowId) =>
    set({ allocations: form.allocations.filter((a) => a.id !== rowId) });

  function setProjectMonth(field, value) {
    const monthValue = dateToMonth(value) || value;
    let startMonth = field === "startMonth" ? monthValue : form.startMonth;
    let endMonth = field === "endMonth" ? monthValue : form.endMonth;
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
    set({
      startMonth,
      endMonth,
      allocations: form.allocations.map((allocation) =>
        clampAllocationToProject(allocation, rateCard.calendar, startMonth, endMonth)
      ),
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

      <div className="builder builder-single">
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
                <input
                  className="input"
                  type="date"
                  value={monthToStartDate(form.startMonth)}
                  min={calendarBounds.min}
                  max={calendarBounds.max}
                  onChange={(e) => setProjectMonth("startMonth", e.target.value)}
                />
              </label>
              <label>
                End month
                <input
                  className="input"
                  type="date"
                  value={monthToEndDate(form.endMonth)}
                  min={calendarBounds.min}
                  max={calendarBounds.max}
                  onChange={(e) => setProjectMonth("endMonth", e.target.value)}
                />
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
                    <th>Start month</th>
                    <th>End month</th>
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
                      <td>
                        <input
                          className="input"
                          type="date"
                          value={monthToStartDate(
                            clampMonthToRange(rateCard.calendar, a.startMonth, form.startMonth, form.endMonth)
                          )}
                          min={projectBounds.min}
                          max={projectBounds.max}
                          aria-label={`Start month for ${a.role || "allocation row"}`}
                          onChange={(e) => setAllocationMonth(a.id, "startMonth", e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className="input"
                          type="date"
                          value={monthToEndDate(
                            clampMonthToRange(
                              rateCard.calendar,
                              endMonthFor(a, rateCard.calendar),
                              form.startMonth,
                              form.endMonth
                            )
                          )}
                          min={projectBounds.min}
                          max={projectBounds.max}
                          aria-label={`End month for ${a.role || "allocation row"}`}
                          onChange={(e) => setAllocationMonth(a.id, "endMonth", e.target.value)}
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
                      <td colSpan={8} className="empty">
                        No rows. Add one, or use AI assist.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="allocation-checks">
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
            </div>
          </div>

          <WonBuilderAiAssist
            form={form}
            existing={existing}
            rateCard={rateCard}
            setForm={set}
            blankRow={blankRow}
          />

        </div>
      </div>
    </div>
  );
}
