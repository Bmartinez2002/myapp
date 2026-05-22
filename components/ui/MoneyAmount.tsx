import { fmtCOP, fmtFull } from "@/lib/money";

export function MoneyAmount({ cents, full = false, className }: { cents: number | bigint; full?: boolean; className?: string }) {
  return <span className={"mono " + (className ?? "")}>{full ? fmtFull(cents) : fmtCOP(cents)}</span>;
}
