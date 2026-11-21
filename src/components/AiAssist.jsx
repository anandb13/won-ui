import { useEffect, useRef, useState } from "react";
import { AI_IS_MOCK, sendChat } from "../lib/aiChat.js";
import { inr } from "../lib/cost.js";
import { monthLabel } from "../data/reference.js";
import { isReady, missingInputs, monthCount } from "../lib/wonDraft.js";

const STARTERS = [
  "Create a WON named Data Platform Migration, from Oct 2026 to Mar 2027. Team: 1 Project Manager (CONS, India, Bangalore, D&A), 1 Data Architect (CONS, UK, D&A), 3 Data Engineers (AST, India, Bangalore, D&A), 4 Data Engineers (ASE, India, Hyderabad, D&A), 2 QA Engineers (ASE, India, Hyderabad, D&A). Contract ID C-2210, contract value 120000 GBP, reference WON REF-3105.",
  "Create a WON named Support Desk Expansion, from Jan 2027 to Jun 2027. Team: 1 Delivery Lead (BPO6, India, Chennai, BPS), 2 Team Leads (BPO5, India, Chennai, BPS), 8 Support Agents (BPO4, India, Chennai, BPS), 6 Support Agents (BPO3, India, Kochi, BPS). Contract ID C-3377, contract value 3500000 INR, skip the reference WON number.",
  "Create a WON named Cloud Modernization, from Jul 2026 to Dec 2026. Team: 1 Engagement Manager (CONS, Canada, Cloud), 2 Cloud Architects (ASC, US, Cloud), 3 DevOps Engineers (ITA, India, Pune, Cloud), 3 Developers (ASE, India, Pune, ADM), 1 Developer (ASE, Mexico, ADM), 2 Associate Engineers (TRAINEE, India, Noida, ADM). Skip the contract ID and reference WON number, contract value 250000 USD.",
];

// Chat that gathers what a WON needs, asks for whatever is missing, then builds the WON.
// The chat only fills the form. Saving (and the WON number) stays with the Create button.
//
// Props
//   context      : allowed values (months, categories, countries, locations, units, currencies)
//   getFormDraft : () => draft, the form as it is right now (used to seed a conversation)
//   estimate     : (draft) => number | null, cost from the real cost engine
//   onBuild      : (draft) => void, writes the draft into the form
export default function AiAssist({ context, getFormDraft, estimate, onBuild }) {
  const [messages, setMessages] = useState([]); // {id, role, content}
  const [draft, setDraft] = useState(null); // null until the first message
  const [built, setBuilt] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const idRef = useRef(0);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, error]);
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [input]);

  async function send(text, history = messages) {
    const content = text.trim();
    if (!content || busy) return;
    // Seed from the form on the first message, and again after a build, so manual edits count.
    const current = draft && !built ? draft : getFormDraft();
    const next = [...history, { id: ++idRef.current, role: "user", content }];
    setMessages(next);
    setInput("");
    setError("");
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await sendChat({
        messages: next.map(({ role, content }) => ({ role, content })),
        context,
        draft: current,
        signal: controller.signal,
      });
      setDraft(res.draft);
      setBuilt(false);
      setMessages((m) => [...m, { id: ++idRef.current, role: "assistant", content: res.reply }]);
    } catch (e) {
      if (e.name !== "AbortError") setError(e.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function retry() {
    const last = messages[messages.length - 1];
    if (last?.role === "user") send(last.content, messages.slice(0, -1));
  }

  function reset() {
    abortRef.current?.abort();
    setMessages([]);
    setDraft(null);
    setBuilt(false);
    setError("");
    setBusy(false);
  }

  function build() {
    onBuild(draft);
    setBuilt(true);
  }

  const lastIsUser = messages[messages.length - 1]?.role === "user";

  return (
    <div className="card pad chat">
      <div className="page-head tight">
        <h2>AI assist</h2>
        {messages.length > 0 && (
          <button className="btn" onClick={reset}>
            New chat
          </button>
        )}
      </div>
      <p className="muted small">
        Describe the work. I will ask for anything the WON still needs, then fill in the form for
        you to review.
        {AI_IS_MOCK && " Demo mode: no backend connected."}
      </p>

      <div className="chat-list" ref={listRef} aria-live="polite">
        {messages.length === 0 && (
          <div className="chat-empty">
            <div className="muted small">Try one of these</div>
            <div className="chat-chips">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="chip"
                  onClick={() => {
                    setInput(s);
                    inputRef.current?.focus();
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.role}`}>
            <div className="chat-bubble">{m.content}</div>
          </div>
        ))}
        {busy && (
          <div className="chat-msg assistant">
            <div className="chat-bubble typing">Thinking…</div>
          </div>
        )}
        {error && (
          <div className="chat-error" role="alert">
            {error}{" "}
            {lastIsUser && !busy && (
              <button className="btn" onClick={retry}>
                Retry
              </button>
            )}
          </div>
        )}
      </div>

      {draft && (
        <DraftPanel
          draft={draft}
          context={context}
          total={estimate(draft)}
          built={built}
          onBuild={build}
        />
      )}

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          ref={inputRef}
          className="input"
          rows={2}
          placeholder="Message the assistant…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        {busy ? (
          <button type="button" className="btn" onClick={() => abortRef.current?.abort()}>
            Stop
          </button>
        ) : (
          <button type="submit" className="btn primary" disabled={!input.trim()}>
            Send
          </button>
        )}
      </form>
    </div>
  );
}

function DraftPanel({ draft, context, total, built, onBuild }) {
  const missing = missingInputs(draft);
  const required = missing.filter((m) => m.required);
  const optional = missing.filter((m) => !m.required);
  const months = monthCount(context, draft);
  const heads = draft.rows.reduce((s, r) => s + r.count, 0);
  const ready = isReady(draft);

  return (
    <div className="suggestion chat-proposal">
      <h3>WON draft</h3>
      <dl className="draft-facts">
        <Fact label="Name" value={draft.name} />
        <Fact
          label="Period"
          value={
            draft.startMonth && draft.endMonth
              ? `${monthLabel(draft.startMonth)} to ${monthLabel(draft.endMonth)} (${months} mo)`
              : ""
          }
        />
        <Fact label="Contract ID" value={draft.contractId} />
        <Fact
          label="Contract value"
          value={draft.contractValue === "" ? "" : `${draft.contractValueCurrency} ${Number(draft.contractValue).toLocaleString("en-IN")}`}
        />
        <Fact label="Reference WON" value={draft.referenceWonNumber} />
      </dl>

      {draft.rows.length > 0 && (
        <>
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Category</th>
                <th>Country</th>
                <th className="num">Count</th>
              </tr>
            </thead>
            <tbody>
              {draft.rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.role}</td>
                  <td>{r.category}</td>
                  <td>
                    {r.country}
                    {r.workLocation ? ` · ${r.workLocation}` : ""}
                  </td>
                  <td className="num">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="muted small chat-total">
            {heads} people{months ? ` x ${months} month${months === 1 ? "" : "s"}` : ""} ·{" "}
            {total == null ? "estimate once the period is set" : `est. ${inr(total)}`}
          </div>
        </>
      )}

      {required.length > 0 && (
        <div className="chat-missing">
          <strong className="small">Still needed</strong>
          <ul>
            {required.map((m) => (
              <li key={m.key}>{m.label}</li>
            ))}
          </ul>
        </div>
      )}
      {ready && optional.length > 0 && (
        <div className="muted small chat-total">
          Optional, not provided: {optional.map((m) => m.label).join(", ")}
        </div>
      )}

      <div className="row-gap">
        <button className="btn primary" disabled={!ready || built} onClick={onBuild}>
          {built ? "Built into form" : "Build WON"}
        </button>
        {built && <span className="small chat-applied">Review the form, then press Create.</span>}
      </div>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className={value ? "" : "muted"}>{value || "not set"}</dd>
    </div>
  );
}
