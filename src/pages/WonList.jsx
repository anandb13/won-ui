import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store.jsx";
import { STATUSES } from "../lib/cost.js";

export default function WonList() {
  const { wons } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("All");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return wons.filter((w) => {
      if (status !== "All" && w.status !== status) return false;
      if (!term) return true;
      return [w.contractId, w.name || w.title]
        .some((value) => (value || "").toLowerCase().includes(term));
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
          placeholder="Search Contract ID or WON name"
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
              <th className="num">#</th>
              <th>Contract ID</th>
              <th>WON name</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w, index) => (
              <tr key={w.id}>
                <td className="num">{index + 1}</td>
                <td>{w.contractId || "-"}</td>
                <td>
                  <Link to={`/won/${w.id}`}>{w.name || w.title}</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="empty">
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
