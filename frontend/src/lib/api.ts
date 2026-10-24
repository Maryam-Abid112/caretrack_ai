// Calls to the FastAPI backend. Uses lib/mock.ts while USE_MOCK is on.

import { mockFileUrl, mockGetHistory, mockGetPatients, mockUpload } from "./mock";
import type { Patient, PatientHistory, UploadResponse } from "./types";

export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== "false";
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
export const MAX_FILE_MB = 10;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Server error (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function getPatients(): Promise<Patient[]> {
  return USE_MOCK ? mockGetPatients() : request("/patients");
}

export function getHistory(patientId: string): Promise<PatientHistory> {
  return USE_MOCK ? mockGetHistory(patientId) : request(`/patients/${patientId}/history`);
}

export function uploadReport(patientId: string, file: File): Promise<UploadResponse> {
  if (USE_MOCK) return mockUpload(patientId, file);
  const form = new FormData();
  form.append("file", file);
  form.append("patientId", patientId);
  return request("/upload", { method: "POST", body: form });
}

// Returns null when the original file isn't available (seed data in mock mode).
export function reportFileUrl(reportId: string): string | null {
  return USE_MOCK ? mockFileUrl(reportId) : `${API_URL}/reports/${reportId}/file`;
}

// Check before upload: type and size.
export function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return "Please upload a JPG, PNG or PDF file.";
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `File is too big. Maximum is ${MAX_FILE_MB} MB.`;
  return null;
}
