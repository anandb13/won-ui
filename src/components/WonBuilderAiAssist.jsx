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

  // The form as it is now, so the chat starts from (and never overwrites) what is already filled.
  const getFormDraft = () => ({
    name: form.name,
    referenceWonNumber: form.referenceWonNumber,
    contractId: form.contractId,
    contractValue: form.contractValue,
    contractValueCurrency: form.contractValueCurrency,
    // A new WON has default dates the user never chose.
    startMonth: existing || form.allocations.some((a) => a.role.trim()) ? form.startMonth : "",
    endMonth: existing || form.allocations.some((a) => a.role.trim()) ? form.endMonth : "",
    rows: form.allocations
      .filter((a) => a.role.trim())
      .map(({ role, category, country, workLocation, businessUnit, count }) => ({
        role,
        category,
        country,
        workLocation,
        businessUnit,
        count: Number(count) || 1,
      })),
    skipped: [],
  });

  const draftAllocations = (d) => {
    const n = aiContext.months.indexOf(d.endMonth) - aiContext.months.indexOf(d.startMonth) + 1;
    return d.rows.map((row) => ({ ...blankRow(d.startMonth, n), ...row }));
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
