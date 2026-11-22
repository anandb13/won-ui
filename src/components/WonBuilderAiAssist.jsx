import { BUSINESS_UNITS, INDIA_WORK_LOCATIONS } from "../data/reference.js";
import { summarize } from "../lib/cost.js";
import AiAssist from "./AiAssist.jsx";

export default function WonBuilderAiAssist({ form, existing, rateCard, setForm, blankRow }) {
  const aiContext = {
    months: rateCard.calendar.map((month) => month.month),
    categories: rateCard.roles,
    countries: rateCard.countries,
    indiaLocations: INDIA_WORK_LOCATIONS,
    businessUnits: BUSINESS_UNITS,
    currencies: rateCard.currencyFactors.map((c) => c.currency),
  };

  const monthIndex = (month) => aiContext.months.indexOf(month);
  const rowEndMonth = (row) => {
    const start = monthIndex(row.startMonth);
    if (start < 0) return "";
    const months = Math.max(1, Math.ceil(Number(row.months) || 1));
    return aiContext.months[Math.min(aiContext.months.length - 1, start + months - 1)] || row.startMonth || "";
  };
  const clampToDraftRange = (month, startMonth, endMonth) => {
    const idx = monthIndex(month);
    const start = monthIndex(startMonth);
    const end = monthIndex(endMonth);
    if (idx < 0 || start < 0 || end < 0) return startMonth || month || "";
    return aiContext.months[Math.min(Math.max(start, end), Math.max(Math.min(start, end), idx))] || startMonth;
  };

  // The form as it is now, so the chat starts from (and never overwrites) what is already filled.
  const getFormDraft = () => {
    const hasDates = existing || form.allocations.some((a) => a.role.trim());
    return {
      name: form.name,
      referenceWonNumber: form.referenceWonNumber,
      contractId: form.contractId,
      contractValue: form.contractValue,
      contractValueCurrency: form.contractValueCurrency,
      // A new WON has default dates the user never chose.
      startMonth: hasDates ? form.startMonth : "",
      endMonth: hasDates ? form.endMonth : "",
      rows: form.allocations
        .filter((a) => a.role.trim())
        .map(({ role, category, country, workLocation, businessUnit, startMonth, months }) => ({
          role,
          category,
          country,
          workLocation,
          businessUnit,
          startMonth: startMonth || form.startMonth,
          months: Math.max(1, Math.ceil(Number(months) || 1)),
          count: 1,
        })),
      skipped: [],
    };
  };

  const draftAllocations = (d) => {
    const projectStart = d.startMonth || form.startMonth;
    const projectEnd = d.endMonth || form.endMonth || projectStart;
    const defaultMonths = Math.max(1, monthIndex(projectEnd) - monthIndex(projectStart) + 1 || 1);
    return d.rows.map((row) => {
      const rawStart = aiContext.months.includes(row.startMonth) ? row.startMonth : projectStart;
      let startMonth = clampToDraftRange(rawStart, projectStart, projectEnd);
      let endMonth = clampToDraftRange(rowEndMonth({ ...row, startMonth: rawStart }) || projectEnd, projectStart, projectEnd);
      if (monthIndex(endMonth) < monthIndex(startMonth)) endMonth = startMonth;
      const months = Math.max(1, monthIndex(endMonth) - monthIndex(startMonth) + 1 || defaultMonths);
      return {
        ...blankRow(startMonth, endMonth, aiContext.months.map((month) => ({ month }))),
        ...row,
        startMonth,
        months,
        count: 1,
      };
    });
  };

  const estimateDraft = (d) =>
    d.startMonth && d.endMonth && d.rows.length
      ? summarize(draftAllocations(d), rateCard, 0).total
      : null;

  const buildFromDraft = (d) =>
    setForm({
      name: d.name,
      referenceWonNumber: d.referenceWonNumber,
      contractId: d.contractId,
      contractValue: d.contractValue,
      contractValueCurrency: d.contractValueCurrency,
      startMonth: d.startMonth,
      endMonth: d.endMonth,
      allocations: draftAllocations(d),
    });

  return (
    <AiAssist
      context={aiContext}
      getFormDraft={getFormDraft}
      estimate={estimateDraft}
      onBuild={buildFromDraft}
    />
  );
}
