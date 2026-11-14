import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store.jsx";
import { STATUSES, inr } from "../lib/cost.js";

export default function WonList() {
  const { wons } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return wons.filter((w) => {
      if (status !== "All" && w.status !== status) return false;
      if (!term) return true;
      return [w.number, w.title, w.client].some((s) => s.toLowerCase().includes(term));
    });
  }, [wons, q, status]);

  return (
    <div>
      <div className="page-head">
        <h1>Work orders</h1>
        <Link className="btn primary" to="/won/new">
          New WON
        </Link>
      </div>

      <div className="toolbar">
        <input
          className="input"
          placeholder="Search number, title or client"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option>All</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>WON</th>
              <th>Title</th>
              <th>Client</th>
              <th>Status</th>
              <th className="num">Version</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => {
              const last = w.versions[w.versions.length - 1];
              return (
                <tr key={w.id}>
                  <td>
                    <Link to={`/won/${w.id}`}>{w.number}</Link>
                  </td>
                  <td>{w.title}</td>
                  <td>{w.client}</td>
                  <td>
                    <span className={`badge s-${w.status.toLowerCase()}`}>{w.status}</span>
                  </td>
                  <td className="num">v{last.v}</td>
                  <td className="num">{inr(last.total)}</td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="empty">
                  No work orders match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
