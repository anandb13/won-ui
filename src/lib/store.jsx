import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { SEED_WONS } from "../data/mock.js";
import { REFERENCE_DATA } from "../data/reference.js";
import { summarize } from "./cost.js";

// Temporary browser-side store. Each function here becomes an API call to FastAPI.
const KEY = "won-ui-state-v1";

function addSampleContractIds(wons) {
  return wons.map((won) => {
    const sample = SEED_WONS.find((seed) => seed.id === won.id);
    return sample && !won.contractId ? { ...won, contractId: sample.contractId } : won;
  });
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.rateCard) {
        return {
          ...saved,
          rateCard: {
            ...REFERENCE_DATA,
            ...saved.rateCard,
            currencyFactors: REFERENCE_DATA.currencyFactors,
          },
          wons: addSampleContractIds(saved.wons || SEED_WONS),
        };
      }
      return { rateCard: REFERENCE_DATA, wons: addSampleContractIds(saved.wons || SEED_WONS) };
    }
  } catch {
    /* ignore */
  }
  return { rateCard: REFERENCE_DATA, wons: SEED_WONS };
}

const Ctx = createContext(null);

function nextNumber(wons) {
  const year = new Date().getFullYear();
  const prefix = `WON-${year}-`;
  const max = wons
    .filter((w) => w.number.startsWith(prefix))
    .reduce((m, w) => Math.max(m, parseInt(w.number.slice(prefix.length), 10) || 0), 0);
  return prefix + String(max + 1).padStart(4, "0");
}

export function StoreProvider({ children }) {
  const [state, setState] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const api = useMemo(() => {
    return {
      rateCard: state.rateCard,
      rates: state.rateCard.roles,
      wons: state.wons,

      setRate(category, country, rate) {
        setState((s) => ({
          ...s,
          rateCard: {
            ...s.rateCard,
            dailyRates: {
              ...s.rateCard.dailyRates,
              [category]: {
                ...s.rateCard.dailyRates[category],
                [country]: Number(rate) || 0,
              },
            },
          },
        }));
      },

      setNetWorkDays(month, country, netWorkDays) {
        setState((s) => ({
          ...s,
          rateCard: {
            ...s.rateCard,
            calendar: s.rateCard.calendar.map((entry) => {
              if (entry.month !== month) return entry;
              const workDays = Number(entry.workDays) || 0;
              const net = Math.min(workDays, Math.max(0, Number(netWorkDays) || 0));
              return {
                ...entry,
                leaves: {
                  ...entry.leaves,
                  [country]: workDays - net,
                },
              };
            }),
          },
        }));
      },

      // Applies many rate changes at once, e.g. from a CSV upload. changes: [{category, country, newRate}]
      applyRates(changes) {
        setState((s) => {
          const dailyRates = { ...s.rateCard.dailyRates };
          for (const { category, country, newRate } of changes) {
            if (!dailyRates[category]) continue;
            dailyRates[category] = { ...dailyRates[category], [country]: Number(newRate) || 0 };
          }
          return { ...s, rateCard: { ...s.rateCard, dailyRates } };
        });
      },

      resetReferenceData() {
        setState((s) => ({ ...s, rateCard: REFERENCE_DATA }));
      },

      deleteWon(wonId) {
        setState((s) => ({ ...s, wons: s.wons.filter((won) => won.id !== wonId) }));
      },

      setMilestoneFrequency(wonId, frequency) {
        setState((s) => ({
          ...s,
          wons: s.wons.map((won) =>
            won.id === wonId ? { ...won, milestoneFrequency: frequency } : won
          ),
        }));
      },

      // Saves a new WON, or adds a new immutable version to an existing one.
      // Each version keeps the rates it was priced with.
      saveWon(draft) {
        const now = new Date().toISOString();
        const totals = summarize(draft.allocations, state.rateCard, 0);
        const existing = state.wons.find((w) => w.id === draft.id);
        const version = {
          v: existing ? existing.versions.length + 1 : 1,
          savedAt: now,
          total: totals.total,
          allocations: JSON.parse(JSON.stringify(draft.allocations)),
          rateSnapshot: JSON.parse(JSON.stringify(state.rateCard)),
          contingencyPct: 0,
        };
        if (existing) {
          setState((s) => ({
            ...s,
            wons: s.wons.map((w) =>
              w.id === existing.id
                ? {
                    ...w,
                    name: draft.name,
                    title: draft.name,
                    referenceWonNumber: draft.referenceWonNumber,
                    contractId: draft.contractId,
                    contractValue: draft.contractValue === "" ? "" : Number(draft.contractValue) || 0,
                    contractValueCurrency: draft.contractValueCurrency || "INR",
                    startMonth: draft.startMonth,
                    endMonth: draft.endMonth,
                    contingencyPct: version.contingencyPct,
                    versions: [...w.versions, version],
                  }
                : w
            ),
          }));
          return existing.id;
        }
        const id = "w" + Date.now();
        const won = {
          id,
          number: nextNumber(state.wons),
          name: draft.name,
          title: draft.name,
          referenceWonNumber: draft.referenceWonNumber,
          contractId: draft.contractId,
          contractValue: draft.contractValue === "" ? "" : Number(draft.contractValue) || 0,
          contractValueCurrency: draft.contractValueCurrency || "INR",
          startMonth: draft.startMonth,
          endMonth: draft.endMonth,
          status: draft.status,
          contingencyPct: version.contingencyPct,
          createdAt: now,
          versions: [version],
        };
        setState((s) => ({ ...s, wons: [won, ...s.wons] }));
        return id;
      },
    };
  }, [state]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore() {
  return useContext(Ctx);
}
