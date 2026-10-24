# CareTrack AI: Patient Frontend

The patient side of **CareTrack AI**. A patient uploads a lab report, and AI agents (connected through **DNotifier**) read it, compare it with earlier reports, and show the results as **trend cards, a chart, and a simple summary**.

> Prototype for a hackathon. Uses sample data only. Not a medical device and does not give a diagnosis.

---

## Features

- **Choose patient:** pick a patient from a dropdown (no login)
- **Upload report:** JPG, PNG or PDF, max 10 MB, drag and drop or button
- **Live agent progress:** 4 steps tick live:
  1. Reading report (Extraction Agent)
  2. Checking values (Validation Agent)
  3. Comparing with earlier reports (Trend Agent)
  4. Writing summary (Summary Agent)
- **Trend cards:** latest value, ▲/▼ change, rising/falling/stable, **Pending** badge
- **Trend chart:** each test over time, with the normal range shown as a band
- **Summary:** plain-language explanation with clickable report-date citations
- **Report list:** all uploaded reports, click to open the original file
- **Screen states:** loading, empty, first report only, and error
- **Mock mode:** works fully without the backend

---

## Tech stack

| Part | Tool |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Backend (separate) | Python FastAPI + AI agents + DNotifier |

---

## Getting started

### 1. Install dependencies
```bash
npm install
npm install recharts
```

### 2. Set up environment variables
Copy `.env.local.example` to `.env.local`:
```
NEXT_PUBLIC_USE_MOCK=true
NEXT_PUBLIC_API_URL=http://localhost:8000
```
- `NEXT_PUBLIC_USE_MOCK=true` uses fake data (no backend needed)
- `NEXT_PUBLIC_USE_MOCK=false` connects to the FastAPI backend

> Never put AI or DNotifier secret keys here. `NEXT_PUBLIC_` values are visible in the browser.

### 3. Run
```bash
npm run dev
```
Open http://localhost:3000

---

## Folder structure

```
src/
├─ app/
│  ├─ layout.tsx
│  └─ page.tsx              # Patient page
├─ components/
│  ├─ PatientSelect.tsx     # Patient dropdown
│  ├─ UploadBox.tsx         # Drag-and-drop upload
│  ├─ ProgressSteps.tsx     # Live agent steps
│  ├─ TrendCard.tsx         # One card per test
│  ├─ TrendChart.tsx        # Line chart (Recharts)
│  ├─ SummaryBox.tsx        # Summary + citations
│  └─ ReportList.tsx        # Uploaded reports
└─ lib/
   ├─ types.ts              # Data types shared with the backend
   ├─ api.ts                # Calls to FastAPI (or mock)
   ├─ live.ts               # Live progress (SSE / DNotifier)
   ├─ mock.ts               # Fake data for demo mode
   └─ format.ts             # Date and range helpers
```

---

## How it works

```
Patient uploads report
   → POST /upload (FastAPI)
   → report.uploaded   → Extraction Agent  (AI reads the report)
   → report.extracted  → Validation Agent  (fix names/units, mark Pending)
   → report.validated  → Trend Agent       (compare with old reports)
   → trend.computed    → Summary Agent     (AI writes simple summary)
   → summary.ready     → Frontend refreshes cards, chart, summary

All agents send progress.update → frontend shows live steps
```

All agents talk only through **DNotifier**. FastAPI forwards the messages to the browser.

---

## Backend API (what the frontend expects)

| Method | Endpoint | Returns |
|---|---|---|
| GET | `/patients` | List of patients |
| GET | `/patients/{id}/history` | `{ patient, reports, trends, summary }` |
| POST | `/upload` (form: `file`, `patientId`) | `{ reportId, status: "processing" }` |
| GET | `/reports/{reportId}/file` | Original uploaded file |
| GET | `/events/{reportId}` | Live updates (Server-Sent Events) |

### Live events (`/events/{reportId}`)
| Event name | Data |
|---|---|
| `progress.update` | `{ reportId, agent, step, done }` |
| `summary.ready` | Summary (pipeline finished) |
| `report.error` | `{ message }` |

Agent names must be exactly: `Extraction Agent`, `Validation Agent`, `Trend Agent`, `Summary Agent`.

### Trend format
```json
{
  "name": "HbA1c",
  "unit": "%",
  "status": "pending",
  "refRange": "4.0-5.6",
  "history": [
    { "date": "2026-03-10", "value": 7.2, "reportId": "R1" },
    { "date": "2026-06-15", "value": 7.9, "reportId": "R2" },
    { "date": "2026-09-20", "value": 8.6, "reportId": "R7" }
  ],
  "change": 0.7,
  "changePct": 8.9,
  "direction": "rising",
  "inRange": false
}
```

---

## Demo (mock mode)

1. Select **Ramesh Kumar**. He already has 2 reports (HbA1c 7.2 → 7.9).
2. Upload any PNG or JPG.
3. Watch the 4 agent steps tick live.
4. See the result: **HbA1c 8.6% ▲ +0.7, rising, Pending**, a chart with 3 points, and the summary with citations.

**Other cases:**
- **Joseph D'Souza:** no reports, shows the empty state
- A file named **`blurry.png`:** shows the error state

---

## Safety rules

- No diagnosis or medical advice, only changes in values
- All AI-extracted values show **Pending** until a doctor verifies them
- Only the same test in the same unit is compared
- Original reports can always be opened
- Sample data only

---

## Roadmap

- Doctor screen: verify or correct values
- Worsening-trend flags for doctors
- Ask-your-history assistant (semantic search + RAG)
- Caretaker alerts

---

## Team

Built for the hackathon, category **Best Use of DNotifier**.