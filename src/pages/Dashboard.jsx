import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store.jsx";
import { STATUSES, inr, summarize } from "../lib/cost.js";

function Bars({ items, format }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="bars">
      {items.map((i) => (
        <div className="bar-row" key={i.label}>
          <span className="bar-label">{i.label}</span>
          <span className="bar-track">
            <span className="bar-fill" style={{ width: `${(i.value / max) * 100}%` }} />
          </span>
          <span className="bar-value">{format(i.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { wons, rateCard } = useStore();

  const stats = useMemo(() => {
    const latest = wons.map((w) => w.versions[w.versions.length - 1]);
    const total = latest.reduce((t, v) => t + v.total, 0);
    const approved = wons
      .filter((w) => w.status === "Approved")
      .reduce((t, w) => t + w.versions[w.versions.length - 1].total, 0);

    const byStatus = STATUSES.map((s) => ({
      label: s,
      value: wons.filter((w) => w.status === s).length,
    }));

    // Cost per category, using each version's own saved reference values.
    const categoryTotals = {};
    for (const v of latest) {
      const s = summarize(v.allocations, v.rateSnapshot, v.contingencyPct);
      for (const [category, cost] of Object.entries(s.byCategory))
        categoryTotals[category] = (categoryTotals[category] || 0) + cost;
    }
    const byCategory = rateCard.roles.map((role) => ({
      label: role.id,
      value: categoryTotals[role.id] || 0,
    }));

    return { count: wons.length, total, approved, avg: wons.length ? total / wons.length : 0, byStatus, byCategory };
  }, [wons, rateCard]);

  return (
    <div>
      <div className="page-head">
        <h1>Dashboard</h1>
        <Link className="btn primary" to="/won/new">
          New WON
        </Link>
      </div>

      <div className="stat-grid">
        <div className="card stat">
          <span className="stat-label">Work orders</span>
          <span className="stat-value">{stats.count}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Total value</span>
          <span className="stat-value">{inr(stats.total)}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Approved value</span>
          <span className="stat-value">{inr(stats.approved)}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Average per WON</span>
          <span className="stat-value">{inr(stats.avg)}</span>
        </div>
      </div>

      <div className="two-col">
        <div className="card pad">
          <h2>Work orders by status</h2>
          <Bars items={stats.byStatus} format={(n) => n} />
        </div>
        <div className="card pad">
          <h2>Cost by category</h2>
          <Bars items={stats.byCategory} format={inr} />
        </div>
      </div>
    </div>
  );
}
