// Data shapes shared with the FastAPI backend — the backend must send exactly these.

export type Direction = "rising" | "falling" | "stable";
export type ValueStatus = "pending" | "verified";

export interface Patient {
  id: string;
  name: string;
  age: number;
  condition: string;
}

export interface Report {
  reportId: string;
  patientId: string;
  date: string; // ISO date of the lab report, e.g. "2026-09-20"
  fileName: string;
  status: "processing" | "done" | "error";
}

export interface HistoryPoint {
  date: string;
  value: number;
  reportId: string;
}

export interface Trend {
  name: string; // standard test name, e.g. "HbA1c"
  unit: string;
  status: ValueStatus;
  refRange?: string; // e.g. "4.0-5.6"
  history: HistoryPoint[]; // sorted oldest -> newest
  change: number | null; // latest minus previous, null if only one report
  changePct: number | null;
  direction: Direction;
  inRange: boolean | null; // latest value inside refRange, null if unknown
}

export interface Citation {
  reportId: string;
  date: string;
}

export interface Summary {
  reportId: string;
  patientId: string;
  text: string;
  citations: Citation[];
}

export interface PatientHistory {
  patient: Patient;
  reports: Report[];
  trends: Trend[];
  summary: Summary | null;
}

export interface UploadResponse {
  reportId: string;
  status: "processing";
}

// progress.update message from the agents
export interface ProgressUpdate {
  reportId: string;
  agent: string; // one of AGENT_STEPS[].agent
  step: string; // human text, e.g. "Comparing with 2 earlier reports"
  done: boolean;
}

// The four agents, in pipeline order. The backend must use these exact agent names.
export const AGENT_STEPS = [
  { agent: "Extraction Agent", label: "Reading report" },
  { agent: "Validation Agent", label: "Checking values" },
  { agent: "Trend Agent", label: "Comparing with earlier reports" },
  { agent: "Summary Agent", label: "Writing summary" },
] as const;

export type StepState = "waiting" | "active" | "done" | "error";
