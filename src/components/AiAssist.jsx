import { useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { AI_IS_MOCK, sendChat } from "../lib/aiChat.js";
import { inr } from "../lib/cost.js";
import { monthLabel } from "../data/reference.js";
import { isReady, missingInputs, monthCount } from "../lib/wonDraft.js";

function rowEndMonth(context, row, fallbackEnd) {
  const start = context.months.indexOf(row.startMonth || "");
  if (start < 0) return fallbackEnd || "";
  const months = Math.max(1, Math.ceil(Number(row.months) || 1));
  return context.months[Math.min(context.months.length - 1, start + months - 1)] || fallbackEnd || row.startMonth || "";
}

const STARTERS = [
  {
    title: "Data Platform Migration",
    prompt:
      "Create a WON named Data Platform Migration, from Jan 2027 to Jun 2027. Team: 1 Project Manager (CONS, India, Bangalore, D&A), 1 Data Architect (CONS, UK, D&A), 3 Data Engineers (AST, India, Bangalore, D&A), 4 Data Engineers (ASE, India, Hyderabad, D&A), 2 QA Engineers (ASE, India, Hyderabad, D&A). Contract ID C-2210, contract value 120000 GBP, reference WON REF-3105.",
  },
  {
    title: "Support Desk Expansion",
    prompt:
      "Create a WON named Support Desk Expansion, from Jan 2027 to Jun 2027. Team: 1 Delivery Lead (BPO6, India, Chennai, BPS), 2 Team Leads (BPO5, India, Chennai, BPS), 8 Support Agents (BPO4, India, Chennai, BPS), 6 Support Agents (BPO3, India, Kochi, BPS). Contract ID C-3377, contract value 3500000 INR, skip the reference WON number.",
  },
  {
    title: "Cloud Modernization",
    prompt:
      "Create a WON named Cloud Modernization, from Jul 2027 to Dec 2027. Team: 1 Engagement Manager (CONS, Canada, Cloud), 2 Cloud Architects (ASC, US, Cloud), 3 DevOps Engineers (ITA, India, Pune, Cloud), 3 Developers (ASE, India, Pune, ADM), 1 Developer (ASE, Mexico, ADM), 2 Associate Engineers (TRAINEE, India, Noida, ADM). Skip the contract ID and reference WON number, contract value 250000 USD.",
  },
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
    <Card>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h2">AI assist</Typography>
          {messages.length > 0 && (
            <Button size="small" variant="outlined" color="inherit" onClick={reset}>
              New chat
            </Button>
          )}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Describe the work. I will ask for anything the WON still needs, then fill in the form for
          you to review.
          {AI_IS_MOCK && " Demo mode: no backend connected."}
        </Typography>

        <Stack
          ref={listRef}
          spacing={1.25}
          aria-live="polite"
          sx={{ my: 2, maxHeight: 460, minHeight: 120, overflowY: "auto", pr: 0.5 }}
        >
          {messages.length === 0 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Try one of these
              </Typography>
              <Stack direction="row" useFlexGap flexWrap="wrap" spacing={1}>
                {STARTERS.map((s) => (
                  <Chip
                    key={s.title}
                    label={s.title}
                    variant="outlined"
                    color="primary"
                    clickable
                    onClick={() => {
                      setInput(s.prompt);
                      inputRef.current?.focus();
                    }}
                  />
                ))}
              </Stack>
            </Box>
          )}
          {messages.map((m) => (
            <Bubble key={m.id} role={m.role}>
              {m.content}
            </Bubble>
          ))}
          {busy && (
            <Bubble role="assistant">
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={14} />
                <span>Thinking…</span>
              </Stack>
            </Bubble>
          )}
          {error && (
            <Alert
              severity="error"
              action={
                lastIsUser && !busy ? (
                  <Button color="inherit" size="small" onClick={retry}>
                    Retry
                  </Button>
                ) : null
              }
            >
              {error}
            </Alert>
          )}
        </Stack>

        {draft && (
          <DraftPanel
            draft={draft}
            context={context}
            total={estimate(draft)}
            built={built}
            onBuild={build}
          />
        )}

        <Stack
          component="form"
          direction="row"
          spacing={1}
          alignItems="flex-end"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={8}
            inputRef={inputRef}
            placeholder="Message the assistant…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            slotProps={{ htmlInput: { "aria-label": "Message the assistant" } }}
          />
          {busy ? (
            <Button type="button" variant="outlined" color="inherit" onClick={() => abortRef.current?.abort()}>
              Stop
            </Button>
          ) : (
            <Button type="submit" variant="contained" disabled={!input.trim()}>
              Send
            </Button>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

function Bubble({ role, children }) {
  const user = role === "user";
  return (
    <Box
      sx={{
        alignSelf: user ? "flex-end" : "flex-start",
        maxWidth: "90%",
        px: 1.5,
        py: 1,
        borderRadius: 2,
        whiteSpace: "pre-wrap",
        bgcolor: user ? "primary.main" : "grey.100",
        color: user ? "primary.contrastText" : "text.primary",
      }}
    >
      {children}
    </Box>
  );
}

function DraftPanel({ draft, context, total, built, onBuild }) {
  const missing = missingInputs(draft);
  const required = missing.filter((m) => m.required);
  const optional = missing.filter((m) => !m.required);
  const months = monthCount(context, draft);
  const heads = draft.rows.length;
  const ready = isReady(draft);

  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2, mb: 2, bgcolor: "background.default" }}>
      <Typography variant="h3" sx={{ mb: 1.5 }}>
        WON draft
      </Typography>
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", mb: 2 }}>
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
      </Box>

      {draft.rows.length > 0 && (
        <>
          <Card>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Role</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Country</TableCell>
                    <TableCell>Start</TableCell>
                    <TableCell>End</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {draft.rows.map((r, i) => {
                    const start = r.startMonth || draft.startMonth;
                    const end = rowEndMonth(context, { ...r, startMonth: start }, draft.endMonth);
                    return (
                      <TableRow key={i}>
                        <TableCell>{r.role}</TableCell>
                        <TableCell>{r.category}</TableCell>
                        <TableCell>
                          {r.country}
                          {r.workLocation ? ` · ${r.workLocation}` : ""}
                        </TableCell>
                        <TableCell>{start ? monthLabel(start) : "not set"}</TableCell>
                        <TableCell>{end ? monthLabel(end) : "not set"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {heads} people · {total == null ? "estimate once the period is set" : `est. ${inr(total)}`}
          </Typography>
        </>
      )}

      {required.length > 0 && (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          <AlertTitle>Still needed</AlertTitle>
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {required.map((m) => (
              <li key={m.key}>{m.label}</li>
            ))}
          </Box>
        </Alert>
      )}
      {ready && optional.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Optional, not provided: {optional.map((m) => m.label).join(", ")}
        </Typography>
      )}

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
        <Button variant="contained" disabled={!ready || built} onClick={onBuild}>
          {built ? "Built into form" : "Build WON"}
        </Button>
        {built && (
          <Typography variant="body2" color="success.main">
            Review the form, then press Create.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

function Fact({ label, value }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      <Typography variant="body2" color={value ? "text.primary" : "text.secondary"}>
        {value || "not set"}
      </Typography>
    </Box>
  );
}
