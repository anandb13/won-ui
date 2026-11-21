# WON Builder UI (prototype)

React + Vite front end for creating Work Order Numbers (WON) priced by grade.
It runs on sample data stored in the browser (localStorage). No backend yet.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Pages

- **Dashboard**: totals, status counts, cost by grade
- **Work orders**: searchable list
- **New WON / WON page**: details, grade allocation grid with live cost, AI assist (demo), checks, version history
- **Rate card**: edit monthly cost per grade

## What is placeholder

| File | Placeholder | Replace with |
|---|---|---|
| `src/data/mock.js` | Sample grades, rates, WONs | Your real grade-cost data |
| `src/lib/store.jsx` | localStorage store, client-side WON numbers | FastAPI endpoints. WON numbers must be issued by the backend in a transaction |
| `src/lib/cost.js` | Cost engine and validation rules in JS | FastAPI cost engine (the UI only displays results) |
| `src/lib/draft.js` | Keyword-based drafting, used only by the offline mock | Nothing, once the backend is live |

## Cost model used

`cost = monthly rate of grade x headcount x months`, plus contingency %.
Change `lineCost` in `src/lib/cost.js` if your data uses a different basis
(daily rates, hourly rates, fixed price items).

## AI assist (chat)

`AiAssist` is a multi-turn chat that gathers what a WON needs, asks for anything missing, then
builds the WON into the form. The user still reviews it and presses Create, which is when the
WON number is issued.

- **Required to build**: WON name, start and end month, a team (role, grade, headcount, country),
  and an Indian work location for every India row.
- **Asked once, can be skipped**: contract ID, contract value, reference WON number.
- The rules live in `src/lib/wonDraft.js` (mirrored in `won-backend/ai_chat.py`). The **Build WON**
  button is enabled by those rules, not by the model, and the model is told what is missing after
  every update, so it cannot declare the WON ready early or invent a name, dates or a location.
- The browser holds the draft and sends it with each `POST /api/ai/chat` call. The model records
  inputs through an `update_won_draft` tool. It never computes cost; the estimate on the draft
  comes from `src/lib/cost.js`.

Modes:
- Offline demo (default): `VITE_AI_MOCK=true`, keyword-based, no backend.
- Real model: run the separate `won-backend` project (see its README), then set
  `VITE_AI_MOCK=false` in this project's `.env` and restart `npm run dev`. Vite proxies `/api` to
  port 8000.

