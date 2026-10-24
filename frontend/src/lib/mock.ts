// Fake backend so the frontend can be built and demoed without FastAPI/DNotifier.
// Turn it off with NEXT_PUBLIC_USE_MOCK=false in .env.local.

import { formatDate, parseRange } from "./format";
import type {
  Direction, Patient, PatientHistory, ProgressUpdate, Report, Summary, Trend, UploadResponse,
} from "./types";
import { AGENT_STEPS } from "./types";

interface StoredValue {
  reportId: string;
  date: string;
  name: string;
  value: number;
  unit: string;
  refRange: string;
}

const HBA1C = { name: "HbA1c", unit: "%", refRange: "4.0-5.6" };
const FASTING = { name: "Fasting Glucose", unit: "mg/dL", refRange: "70-100" };

const patients: Patient[] = [
  { id: "P1", name: "Ramesh Kumar", age: 67, condition: "Type 2 diabetes" },
  { id: "P2", name: "Anita Sharma", age: 54, condition: "Type 2 diabetes, hypertension" },
  { id: "P3", name: "Joseph D'Souza", age: 72, condition: "Type 1 diabetes" },
];

const reports: Report[] = [
  { reportId: "R1", patientId: "P1", date: "2026-03-10", fileName: "hba1c-march.png", status: "done" },
  { reportId: "R2", patientId: "P1", date: "2026-06-15", fileName: "hba1c-june.png", status: "done" },
  { reportId: "R4", patientId: "P2", date: "2026-04-02", fileName: "lab-april.png", status: "done" },
  { reportId: "R5", patientId: "P2", date: "2026-08-11", fileName: "lab-august.png", status: "done" },
];

const values: StoredValue[] = [
  { reportId: "R1", date: "2026-03-10", ...HBA1C, value: 7.2 },
  { reportId: "R1", date: "2026-03-10", ...FASTING, value: 138 },
  { reportId: "R2", date: "2026-06-15", ...HBA1C, value: 7.9 },
  { reportId: "R2", date: "2026-06-15", ...FASTING, value: 152 },
  { reportId: "R4", date: "2026-04-02", ...HBA1C, value: 6.9 },
  { reportId: "R4", date: "2026-04-02", ...FASTING, value: 124 },
  { reportId: "R5", date: "2026-08-11", ...HBA1C, value: 6.8 },
  { reportId: "R5", date: "2026-08-11", ...FASTING, value: 121 },
];

// What the "agents" extract from the next upload, per patient: [HbA1c, Fasting Glucose].
const NEXT_UPLOAD: Record<string, { date: string; values: [number, number] }> = {
  P1: { date: "2026-09-20", values: [8.6, 171] },
  P2: { date: "2026-10-05", values: [6.9, 119] },
  P3: { date: "2026-10-01", values: [8.1, 165] },
};

const summaries: Record<string, Summary> = {};
const files: Record<string, string> = {}; // reportId -> object URL of the uploaded file
let seq = 10;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function computeTrends(patientId: string): Trend[] {
  const ids = new Set(reports.filter((r) => r.patientId === patientId && r.status === "done").map((r) => r.reportId));
  const groups = new Map<string, StoredValue[]>();
  for (const v of values) {
    if (!ids.has(v.reportId)) continue;
    const key = `${v.name}|${v.unit}`; // only compare same test + same unit
    groups.set(key, [...(groups.get(key) ?? []), v]);
  }
  return [...groups.values()].map((vs) => {
    vs.sort((a, b) => a.date.localeCompare(b.date));
    const last = vs[vs.length - 1];
    const prev = vs.length > 1 ? vs[vs.length - 2] : null;
    const change = prev ? +(last.value - prev.value).toFixed(2) : null;
    const changePct = prev && change !== null ? +((change / prev.value) * 100).toFixed(1) : null;
    const direction: Direction =
      changePct === null || Math.abs(changePct) < 3 ? "stable" : changePct > 0 ? "rising" : "falling";
    const range = parseRange(last.refRange);
    return {
      name: last.name,
      unit: last.unit,
      status: "pending",
      refRange: last.refRange,
      history: vs.map((v) => ({ date: v.date, value: v.value, reportId: v.reportId })),
      change,
      changePct,
      direction,
      inRange: range ? last.value >= range[0] && last.value <= range[1] : null,
    };
  });
}

function writeSummary(patientId: string, reportId: string, trends: Trend[]): Summary {
  const lines = trends.map((t) => {
    const last = t.history[t.history.length - 1];
    if (t.history.length === 1) return `Your first ${t.name} result is ${last.value} ${t.unit} [Report, ${formatDate(last.date)}].`;
    const series = t.history.map((h) => h.value).join(" → ");
    const word = t.direction === "stable" ? "stayed about the same" : t.direction === "rising" ? "gone up" : "gone down";
    return `Your ${t.name} has ${word} across your last ${t.history.length} reports (${series} ${t.unit}) [Report, ${formatDate(last.date)}].`;
  });
  const citations = [
    ...new Map(trends.flatMap((t) => t.history).map((h) => [h.reportId, { reportId: h.reportId, date: h.date }])).values(),
  ].sort((a, b) => a.date.localeCompare(b.date));
  return {
    reportId,
    patientId,
    text: [...lines, "Please discuss these results with your doctor."].join(" "),
    citations,
  };
}

// Seed summaries for patients that already have reports.
for (const p of patients) {
  const t = computeTrends(p.id);
  const lastReport = reports.filter((r) => r.patientId === p.id).at(-1);
  if (t.length && lastReport) summaries[p.id] = writeSummary(p.id, lastReport.reportId, t);
}

export async function mockGetPatients(): Promise<Patient[]> {
  await wait(200);
  return patients;
}

export async function mockGetHistory(patientId: string): Promise<PatientHistory> {
  await wait(300);
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) throw new Error("Patient not found");
  return {
    patient,
    reports: reports.filter((r) => r.patientId === patientId).sort((a, b) => a.date.localeCompare(b.date)),
    trends: computeTrends(patientId),
    summary: summaries[patientId] ?? null,
  };
}

export async function mockUpload(patientId: string, file: File): Promise<UploadResponse> {
  await wait(300);
  const reportId = `R${++seq}`;
  files[reportId] = URL.createObjectURL(file);
  const date = NEXT_UPLOAD[patientId]?.date ?? new Date().toISOString().slice(0, 10);
  reports.push({ reportId, patientId, date, fileName: file.name, status: "processing" });
  return { reportId, status: "processing" };
}

export function mockFileUrl(reportId: string): string | null {
  return files[reportId] ?? null;
}

// Plays the agent pipeline: progress.update for each agent, then finishes the report.
// A file name containing "blurry" fails, to demo the error state.
export async function mockRunPipeline(reportId: string, onProgress: (p: ProgressUpdate) => void): Promise<void> {
  const report = reports.find((r) => r.reportId === reportId);
  if (!report) throw new Error("Report not found");
  const earlier = reports.filter((r) => r.patientId === report.patientId && r.status === "done").length;

  for (const s of AGENT_STEPS) {
    const step =
      s.agent === "Trend Agent" ? `Comparing with ${earlier} earlier report${earlier === 1 ? "" : "s"}` : s.label;
    onProgress({ reportId, agent: s.agent, step, done: false });
    await wait(1100);
    if (s.agent === "Extraction Agent") {
      if (/blurry/i.test(report.fileName)) {
        report.status = "error";
        throw new Error("We couldn't read this report. Try a clearer photo.");
      }
      const next = NEXT_UPLOAD[report.patientId] ?? { values: [7.0, 130] };
      values.push(
        { reportId, date: report.date, ...HBA1C, value: next.values[0] },
        { reportId, date: report.date, ...FASTING, value: next.values[1] },
      );
    }
    if (s.agent === "Trend Agent") report.status = "done";
    if (s.agent === "Summary Agent") {
      summaries[report.patientId] = writeSummary(report.patientId, reportId, computeTrends(report.patientId));
    }
    onProgress({ reportId, agent: s.agent, step, done: true });
  }
}
