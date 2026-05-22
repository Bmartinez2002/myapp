import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { DebtsManager } from "@/components/feature/DebtsManager";

export default async function DebtsPage() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data } = await sb
    .from("debts")
    .select("id, name, source, total_cents, rate_annual, due_at, closed_at")
    .eq("user_id", user.id)
    .order("closed_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true });

  const debts = (data ?? []) as {
    id: string;
    name: string;
    source: string | null;
    total_cents: number;
    rate_annual: number | null;
    due_at: string | null;
    closed_at: string | null;
  }[];

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 flex flex-col gap-3.5 max-w-2xl mx-auto md:max-w-none">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 2 }}>
        <Link
          href="/settings"
          style={{ fontSize: 13, color: "var(--color-fg-3)", textDecoration: "none" }}
        >
          ← Configuración
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Mis deudas</h1>

      <Card>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".12em", color: "var(--color-fg-3)", marginBottom: 14 }}>
          GESTIONAR DEUDAS
        </div>
        <DebtsManager initialDebts={debts} />
      </Card>

      <Card>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".12em", color: "var(--color-fg-3)", marginBottom: 8 }}>
          CÓMO FUNCIONA
        </div>
        <div style={{ fontSize: 12.5, color: "var(--color-fg-3)", lineHeight: 1.6 }}>
          • <strong>Saldo</strong>: ingresa el monto actual que debes (en COP).<br/>
          • <strong>Cerrar</strong>: marca la deuda como pagada — sale del cálculo de estabilidad.<br/>
          • La tasa anual y fecha límite son opcionales, para tu referencia.<br/>
          • Los pagos los registras como gastos con categoría "Pago deuda" en captura.
        </div>
      </Card>
    </div>
  );
}
