import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store.jsx";

export default function WonList() {
  const { wons, deleteWon } = useStore();
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return wons.filter((w) =>
      !term || [w.contractId, w.name || w.title]
        .some((value) => (value || "").toLowerCase().includes(term))
    );
  }, [wons, q]);

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
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Contract ID</th>
              <th>WON name</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w, index) => (
              <tr key={w.id}>
                <td className="num">{index + 1}</td>
                <td>{w.contractId || "-"}</td>
                <td>
                  <Link to={`/won/${w.id}/calculation`}>{w.name || w.title}</Link>
                </td>
                <td>
                  <div className="table-actions">
                    <Link className="btn" to={`/won/${w.id}`}>Edit</Link>
                    <button
                      className="btn"
                      onClick={() => {
                        if (window.confirm(`Delete ${w.name || w.title}? This cannot be undone.`)) {
                          deleteWon(w.id);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">
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
