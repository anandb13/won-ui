import { useState } from "react";
import { draftFromText } from "../lib/draft.js";

// The assistant only proposes rows. Nothing changes until the user clicks Apply.
export default function AiAssist({ onApply }) {
  const [text, setText] = useState("");
  const [suggestion, setSuggestion] = useState(null);

  function generate() {
    if (!text.trim()) return;
    setSuggestion(draftFromText(text));
  }

  return (
    <div className="card pad">
      <h2>AI assist</h2>
      <p className="muted small">
        Describe the requirement and get a draft team. Demo logic for now; this will call the LLM
        endpoint later.
      </p>
      <textarea
        className="input"
        rows={3}
        placeholder="e.g. 8 month mobile app with analytics, cloud hosted"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="row-gap">
        <button className="btn" onClick={generate} disabled={!text.trim()}>
          Draft allocations
        </button>
      </div>

      {suggestion && (
        <div className="suggestion">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Category</th>
                <th>Country</th>
                <th className="num">Count</th>
                <th className="num">Months</th>
              </tr>
            </thead>
            <tbody>
              {suggestion.map((r) => (
                <tr key={r.id}>
                  <td>{r.role}</td>
                  <td>{r.category}</td>
                  <td>{r.country}</td>
                  <td className="num">{r.count}</td>
                  <td className="num">{r.months}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row-gap">
            <button
              className="btn primary"
              onClick={() => {
                onApply(suggestion);
                setSuggestion(null);
              }}
            >
              Apply (replaces rows)
            </button>
            <button className="btn" onClick={() => setSuggestion(null)}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
