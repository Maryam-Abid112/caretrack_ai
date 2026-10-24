export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// "4.0-5.6" -> [4, 5.6]
export function parseRange(range?: string): [number, number] | null {
  const m = range?.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}
