// Live updates for one report while the agents work on it.
//
// Real mode: FastAPI listens on DNotifier and forwards messages to the browser as
// Server-Sent Events at GET /events/{reportId}, using the DNotifier channel name as the event name:
//   event: progress.update   data: {ProgressUpdate}
//   event: summary.ready     data: {Summary}          <- pipeline finished
//   event: report.error      data: {"message": "..."} <- pipeline failed
// If DNotifier has a browser SDK, replace the EventSource below with its subscribe() calls;
// nothing else in the app needs to change.

import { API_URL, USE_MOCK } from "./api";
import { mockRunPipeline } from "./mock";
import type { ProgressUpdate } from "./types";

export interface LiveHandlers {
  onProgress: (p: ProgressUpdate) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

// Returns an unsubscribe function.
export function watchReport(reportId: string, h: LiveHandlers): () => void {
  let closed = false;

  if (USE_MOCK) {
    mockRunPipeline(reportId, (p) => { if (!closed) h.onProgress(p); })
      .then(() => { if (!closed) h.onDone(); })
      .catch((e: Error) => { if (!closed) h.onError(e.message); });
    return () => { closed = true; };
  }

  const es = new EventSource(`${API_URL}/events/${reportId}`);
  const finish = () => { closed = true; es.close(); };
  es.addEventListener("progress.update", (e) => h.onProgress(JSON.parse((e as MessageEvent).data)));
  es.addEventListener("summary.ready", () => { finish(); h.onDone(); });
  es.addEventListener("report.error", (e) => {
    finish();
    h.onError(JSON.parse((e as MessageEvent).data).message ?? "Something went wrong.");
  });
  es.onerror = () => {
    if (closed) return;
    finish();
    h.onError("Lost connection to the server.");
  };
  return finish;
}
