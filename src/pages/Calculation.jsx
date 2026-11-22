import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../lib/store.jsx";
import { categoryFor, inr, lineCost } from "../lib/cost.js";
import { monthLabel } from "../data/reference.js";

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

function allocationEndMonth(allocation, calendar) {
  const start = calendar.findIndex((month) => month.month === allocation.startMonth);
  if (start < 0) return "";
  const months = Math.max(1, Math.ceil(Number(allocation.months) || 1));
  return calendar[Math.min(calendar.length - 1, start + months - 1)]?.month || allocation.startMonth || "";
}

const currencyLocales = {
  INR: "en-IN",
  USD: "en-US",
  CAD: "en-CA",
  AUD: "en-AU",
  GBP: "en-GB",
};

function formatContractValue(amount, currency) {
  return new Intl.NumberFormat(currencyLocales[currency] || "en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function gradeLabel(allocation, roles) {
  const category = categoryFor(allocation);
  return roles.find((role) => role.id === category)?.title || category || "-";
}

function dailyRateInr(allocation, rateCard) {
  const rate = rateCard.dailyRates?.[categoryFor(allocation)]?.[allocation.country];
  return rate == null ? "-" : inr(rate);
}

function milestoneDimensionFor(allocation) {
  const workLocation = allocation.workLocation || allocation.country || "-";
  const businessUnit = allocation.businessUnit || "-";
  return {
    key: `${workLocation}\u0000${businessUnit}`,
    label: businessUnit === "ADM" || businessUnit === "-"
      ? workLocation
      : `${workLocation} - ${businessUnit}`,
  };
}

function milestoneMonths(won, allocations, calendar) {
  const interval = {
    monthly: 1,
    quarterly: 3,
    "half-yearly": 6,
    yearly: 12,
  }[won.milestoneFrequency];
  if (!interval) return [];

  const allocationRanges = allocations
    .map((allocation) => {
      const start = calendar.findIndex((month) => month.month === allocation.startMonth);
      if (start < 0) return null;
      const duration = Math.max(1, Math.ceil(Number(allocation.months) || 1));
      return { start, end: Math.min(calendar.length - 1, start + duration - 1) };
    })
    .filter(Boolean);
  const allocationStart = allocationRanges.length
    ? Math.min(...allocationRanges.map((range) => range.start))
    : -1;
  const allocationEnd = allocationRanges.length
    ? Math.max(...allocationRanges.map((range) => range.end))
    : -1;
  const storedStart = calendar.findIndex((month) => month.month === won.startMonth);
  const storedEnd = calendar.findIndex((month) => month.month === won.endMonth);
  const start = storedStart >= 0 ? storedStart : allocationStart;
  const end = storedEnd >= 0 ? storedEnd : allocationEnd;
  if (start < 0 || end < start) return [];

  const months = [];
  let next = interval === 1 ? start : Math.min(start + interval - 1, end);
  while (next <= end) {
    months.push(calendar[next].month);
    next += interval;
  }
  const endMonth = calendar[end].month;
  if (months[months.length - 1] !== endMonth) months.push(endMonth);
  return months;
}

export default function Calculation() {
  const { id } = useParams();
  const [factorSource, setFactorSource] = useState("ultimatix");
  const { wons, rateCard, setMilestoneFrequency } = useStore();
  const won = wons.find((item) => item.id === id);
  const selectedCurrency = won?.contractValueCurrency || "INR";
  const latestVersion = won?.versions[won.versions.length - 1];
  const calculationRates = rateCard;
  const currencyFactor = rateCard.currencyFactors.find(
    (factor) => factor.currency === selectedCurrency
  );
  const xFactor = currencyFactor?.[
    factorSource === "rt" ? "rtFactor" : "ultimatixFactor"
  ];
  const allocations = expandAllocations(latestVersion?.allocations || []);

  if (!won) {
    return (
      <div>
        <h1>Work order not found</h1>
        <Link to="/won">Back to work orders</Link>
      </div>
    );
  }

  const hasContractValue = won.contractValue !== "" && won.contractValue != null;
  const contractValue = Number(won.contractValue) || 0;
  const calculationRows = allocations.map((allocation) => {
    const totalCostCbInr = lineCost(allocation, calculationRates);
    const totalCostCbSelected = xFactor > 0 ? totalCostCbInr / xFactor : null;
    return { allocation, totalCostCbInr, totalCostCbSelected };
  });
  const totalCostCbSelectedSum = calculationRows.reduce(
    (total, row) => total + (row.totalCostCbSelected || 0),
    0
  );
  const minimumContractValue = totalCostCbSelectedSum * 2;
  const belowProfitabilityTarget =
    hasContractValue && xFactor > 0 && contractValue < minimumContractValue;
  const milestoneMonthList = milestoneMonths(won, allocations, rateCard.calendar);
  const milestoneDimensions = [
    ...new Map(
      allocations
        .filter((allocation) => allocation.workLocation || allocation.country || allocation.businessUnit)
        .map((allocation) => {
          const dimension = milestoneDimensionFor(allocation);
          return [dimension.key, dimension];
        })
    ).values(),
  ];
  const pvSelectedByAllocation = new Map(
    calculationRows.map((row) => [
      row.allocation.id,
      hasContractValue && row.totalCostCbSelected != null && totalCostCbSelectedSum > 0
        ? contractValue * (row.totalCostCbSelected / totalCostCbSelectedSum)
        : null,
    ])
  );
  const pvSelectedByDimension = new Map();
  calculationRows.forEach(({ allocation }) => {
    const pvSelected = pvSelectedByAllocation.get(allocation.id);
    if (pvSelected == null) return;
    const { key } = milestoneDimensionFor(allocation);
    pvSelectedByDimension.set(key, (pvSelectedByDimension.get(key) || 0) + pvSelected);
  });

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>{won.name || won.title}</h1>
        </div>
        <Link className="btn" to="/won">Back to work orders</Link>
      </div>

      <dl className="summary">
        <div>
          <dt>Contract ID</dt>
          <dd>{won.contractId || "-"}</dd>
        </div>
        <div>
          <dt>Contract value</dt>
          <dd>
            {won.contractValue !== "" && won.contractValue != null
              ? formatContractValue(won.contractValue, won.contractValueCurrency)
              : "-"}
          </dd>
        </div>
        <div>
          <dt>Reference WON</dt>
          <dd>{won.referenceWonNumber || "-"}</dd>
        </div>
        <div>
          <dt>Period</dt>
          <dd>
            {won.startMonth && won.endMonth
              ? `${monthLabel(won.startMonth)} - ${monthLabel(won.endMonth)}`
              : "-"}
          </dd>
        </div>
      </dl>

      <h2>Resource allocation</h2>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Grade</th>
              <th>Location</th>
              <th>Work Location</th>
              <th>Business Unit</th>
              <th>Start month</th>
              <th>End month</th>
            </tr>
          </thead>
          <tbody>
            {allocations.map((allocation) => (
              <tr key={allocation.id}>
                <td>{allocation.role || "-"}</td>
                <td>{gradeLabel(allocation, rateCard.roles)}</td>
                <td>{allocation.country || "-"}</td>
                <td>{allocation.workLocation || "-"}</td>
                <td>{allocation.businessUnit || "-"}</td>
                <td>{allocation.startMonth ? monthLabel(allocation.startMonth) : "-"}</td>
                <td>
                  {allocationEndMonth(allocation, calculationRates.calendar)
                    ? monthLabel(allocationEndMonth(allocation, calculationRates.calendar))
                    : "-"}
                </td>
              </tr>
            ))}
            {allocations.length === 0 && (
              <tr>
                <td className="empty" colSpan={7}>No resource allocations.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2>Calculation</h2>
      <div className="factor-toggle" role="group" aria-label="Currency factor source">
        <button
          type="button"
          aria-pressed={factorSource === "ultimatix"}
          onClick={() => setFactorSource("ultimatix")}
        >
          Ultimatix
        </button>
        <button
          type="button"
          aria-pressed={factorSource === "rt"}
          onClick={() => setFactorSource("rt")}
        >
          RT
        </button>
      </div>
      {belowProfitabilityTarget && (
        <div className="banner error">
          Contract value is below the minimum needed for 50% profitability ({formatContractValue(minimumContractValue, selectedCurrency)}).
        </div>
      )}
      <div className="card table-wrap">
        <table className="calculation-table">
          <thead>
            <tr>
              <th>Grade</th>
              <th>Location</th>
              <th>Work Location</th>
              <th>Business Unit</th>
              <th>Cost per day in INR</th>
              <th>Currency</th>
              <th>X factor</th>
              <th>Total Cost (CB) in INR</th>
              <th>{`Total Cost (CB) in ${selectedCurrency}`}</th>
              <th>PV in INR</th>
              <th>{`PV in ${selectedCurrency}`}</th>
              <th>Profitability</th>
            </tr>
          </thead>
          <tbody>
            {calculationRows.map((row) => {
              const { allocation, totalCostCbInr, totalCostCbSelected } = row;
              const pvSelected = pvSelectedByAllocation.get(allocation.id);
              const profitability =
                pvSelected > 0 && totalCostCbSelected != null
                  ? ((pvSelected - totalCostCbSelected) / pvSelected) * 100
                  : null;
              return (
                <tr key={allocation.id}>
                  <td>{gradeLabel(allocation, rateCard.roles)}</td>
                  <td>{allocation.country || "-"}</td>
                  <td>{allocation.workLocation || "-"}</td>
                  <td>{allocation.businessUnit || "-"}</td>
                  <td className="num">{dailyRateInr(allocation, calculationRates)}</td>
                  <td>{selectedCurrency}</td>
                  <td className="num">{xFactor ?? "-"}</td>
                  <td className="num">{inr(totalCostCbInr)}</td>
                  <td className="num">
                    {totalCostCbSelected == null
                      ? "-"
                      : formatContractValue(totalCostCbSelected, selectedCurrency)}
                  </td>
                  <td className="num">
                    {pvSelected == null ? "-" : inr(pvSelected * xFactor)}
                  </td>
                  <td className="num">
                    {pvSelected == null
                      ? "-"
                      : formatContractValue(pvSelected, selectedCurrency)}
                  </td>
                  <td className="num">
                    {profitability == null ? "-" : `${profitability.toFixed(1)}%`}
                  </td>
                </tr>
              );
            })}
            {allocations.length === 0 && (
              <tr>
                <td className="empty" colSpan={12}>No resource allocations.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="milestone-section">
        <div className="milestone-head">
          <h2>Milestone split</h2>
          <label className="milestone-frequency">
            Frequency
          <select
            className="input"
            aria-label="Milestone frequency"
            value={won.milestoneFrequency || ""}
            onChange={(event) => setMilestoneFrequency(won.id, event.target.value)}
          >
            <option value="">Select frequency</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="half-yearly">Half-yearly</option>
            <option value="yearly">Yearly</option>
          </select>
          </label>
        </div>
        <div className="card table-wrap milestone-table-wrap">
          <table className="milestone-table">
            <tbody>
              <tr>
                <td className="milestone-empty" aria-hidden="true" />
                {milestoneDimensions.map(({ key, label }) => (
                  <td key={key}>{label}</td>
                ))}
              </tr>
              {milestoneMonthList.map((month) => (
                <tr key={month}>
                  <td>{monthLabel(month)}</td>
                  {milestoneDimensions.map(({ key }) => {
                    const totalPv = pvSelectedByDimension.get(key);
                    const milestonePv =
                      totalPv != null && milestoneMonthList.length > 0
                        ? totalPv / milestoneMonthList.length
                        : null;
                    return (
                      <td key={key}>
                        {milestonePv == null
                          ? "-"
                          : formatContractValue(milestonePv, selectedCurrency)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}