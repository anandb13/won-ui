import { useStore } from "../lib/store.jsx";
import RateCsvUpload from "../components/RateCsvUpload.jsx";

export default function RateCard() {
  const { rateCard, setRate, setNetWorkDays, applyRates, resetReferenceData } = useStore();

  return (
    <div>
      <div className="page-head">
        <h1>Rate card & inputs</h1>
        <button className="btn" onClick={resetReferenceData}>
          Reset workbook data
        </button>
      </div>
      <p className="muted">
        Reference values from Rate_Card_and_Work_Days.xlsx. WON costs use daily INR rate × net work
        days × number of resources. Changes here update calculations for new and existing work orders.
      </p>

      <RateCsvUpload rateCard={rateCard} onApply={applyRates} />

      <h2>Daily cost by category and country (INR)</h2>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Reference label</th>
              {rateCard.countries.map((country) => (
                <th className="num" key={country}>{country}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rateCard.roles.map((role) => (
              <tr key={role.id}>
                <td>
                  <strong>{role.id}</strong>
                </td>
                <td>{role.title}</td>
                {rateCard.countries.map((country) => (
                  <td className="num" key={country}>
                    <input
                      className="input num-input"
                      type="number"
                      min="0"
                      step="1"
                      aria-label={`${role.id} daily cost in ${country}`}
                      value={rateCard.dailyRates[role.id][country]}
                      onChange={(e) => setRate(role.id, country, e.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Net workdays by month and country</h2>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th className="num">Workdays</th>
              {rateCard.countries.map((country) => (
                <th className="num" key={country}>{country}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rateCard.calendar.map((month) => (
              <tr key={month.month}>
                <td>{new Date(`${month.month}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</td>
                <td className="num">{month.workDays}</td>
                {rateCard.countries.map((country) => {
                  const netWorkDays = month.workDays - (month.leaves[country] || 0);
                  return (
                    <td className="num" key={country}>
                      <input
                        className="input num-input"
                        type="number"
                        min="0"
                        max={month.workDays}
                        step="1"
                        aria-label={`${month.month} net workdays in ${country}`}
                        value={netWorkDays}
                        onChange={(e) => setNetWorkDays(month.month, country, e.target.value)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Currency factors</h2>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Currency</th>
              <th className="num">$ Ultimatix factor</th>
              <th className="num">RT factor</th>
            </tr>
          </thead>
          <tbody>
            {rateCard.currencyFactors.map((factor) => (
              <tr key={factor.currency}>
                <td>{factor.currency}</td>
                <td className="num">{factor.ultimatixFactor}</td>
                <td className="num">{factor.rtFactor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
