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
| `src/lib/draft.js` | Keyword-based drafting | LLM endpoint returning `{ role, grade, count, months }[]` |

## Cost model used

`cost = monthly rate of grade x headcount x months`, plus contingency %.
Change `lineCost` in `src/lib/cost.js` if your data uses a different basis
(daily rates, hourly rates, fixed price items).
