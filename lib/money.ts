// All money stored as bigint cents (COP has no fractional cent — we still use ×100 to keep math integer-safe across currencies).
// Helpers tolerate number for ergonomic call-sites; storage layer must always be bigint.

export function toCents(value: number | string): number {
  if (typeof value === "number") return Math.round(value * 100);
  const cleaned = String(value).replace(/[^0-9.,kKmM-]/g, "").replace(",", ".");
  const m = /^(-?\d+(?:\.\d+)?)([kKmM]?)$/.exec(cleaned);
  if (!m) return 0;
  let n = parseFloat(m[1]);
  if (m[2].toLowerCase() === "k") n *= 1_000;
  if (m[2].toLowerCase() === "m") n *= 1_000_000;
  return Math.round(n * 100);
}

export function fromCents(cents: number | bigint): number {
  return Number(cents) / 100;
}

export function fmtCOP(cents: number | bigint): string {
  const n = fromCents(cents);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2).replace(/\.0+$/, "")}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString("es-CO")}`;
}

export function fmtFull(cents: number | bigint): string {
  return "$" + Math.round(fromCents(cents)).toLocaleString("es-CO");
}
