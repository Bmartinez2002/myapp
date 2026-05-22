// "48k" → 48_000 ; "1.2m" → 1_200_000 ; "1,250" → 1250
export function parseAmount(s: string): number | null {
  if (!s) return null;
  const cleaned = s.toLowerCase().replace(/\s|\$|\.cop/g, "").replace(/\./g, "").replace(",", ".");
  const m = /^(-?\d+(?:\.\d+)?)([km]?)$/.exec(cleaned);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (m[2] === "k") n *= 1_000;
  if (m[2] === "m") n *= 1_000_000;
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}
