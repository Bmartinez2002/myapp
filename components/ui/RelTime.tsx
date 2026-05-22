import { fmtTime } from "@/lib/dates";
export function RelTime({ at }: { at: string | Date }) {
  return <span className="mono text-[10px] text-fg-4">{fmtTime(at)}</span>;
}
