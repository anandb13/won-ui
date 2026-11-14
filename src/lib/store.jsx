import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { SEED_RATES, SEED_WONS } from "../data/mock.js";
import { summarize } from "./cost.js";

// Temporary browser-side store. Each function here becomes an API call to FastAPI.
const KEY = "won-ui-state-v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { rates: SEED_RATES, wons: SEED_WONS };
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
    const rateMap = Object.fromEntries(state.rates.map((r) => [r.grade, r.rate]));
    return {
      rates: state.rates,
      rateMap,
      wons: state.wons,

      setRate(grade, rate) {
        setState((s) => ({
          ...s,
          rates: s.rates.map((r) =>
            r.grade === grade ? { ...r, rate: Number(rate) || 0 } : r
          ),
        }));
      },

      resetSampleData() {
        setState({ rates: SEED_RATES, wons: SEED_WONS });
      },

      // Saves a new WON, or adds a new immutable version to an existing one.
      // Each version keeps the rates it was priced with.
      saveWon(draft) {
        const now = new Date().toISOString();
        const totals = summarize(draft.allocations, rateMap, draft.contingencyPct);
        const existing = state.wons.find((w) => w.id === draft.id);
        const version = {
          v: existing ? existing.versions.length + 1 : 1,
          savedAt: now,
          total: totals.total,
          allocations: JSON.parse(JSON.stringify(draft.allocations)),
          rateSnapshot: rateMap,
          contingencyPct: Number(draft.contingencyPct) || 0,
        };
        if (existing) {
          setState((s) => ({
            ...s,
            wons: s.wons.map((w) =>
              w.id === existing.id
                ? {
                    ...w,
                    title: draft.title,
                    client: draft.client,
                    status: draft.status,
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
          title: draft.title,
          client: draft.client,
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
