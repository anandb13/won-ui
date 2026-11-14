import { useStore } from "../lib/store.jsx";
import { inr } from "../lib/cost.js";

export default function RateCard() {
  const { rates, setRate, resetSampleData } = useStore();

  return (
    <div>
      <div className="page-head">
        <h1>Rate card</h1>
        <button className="btn" onClick={resetSampleData}>
          Reset sample data
        </button>
      </div>
      <p className="muted">
        Monthly cost per grade. Changing a rate affects new and edited work orders only; saved
        versions keep the rates they were priced with.
      </p>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Grade</th>
              <th>Title</th>
              <th className="num">Monthly rate (INR)</th>
              <th>Shown as</th>
              <th>Effective from</th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r) => (
              <tr key={r.grade}>
                <td>
                  <strong>{r.grade}</strong>
                </td>
                <td>{r.title}</td>
                <td className="num">
                  <input
                    className="input num-input"
                    type="number"
                    min="0"
                    step="1000"
                    value={r.rate}
                    onChange={(e) => setRate(r.grade, e.target.value)}
                  />
                </td>
                <td>{inr(r.rate)}</td>
                <td>{r.effectiveFrom}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
