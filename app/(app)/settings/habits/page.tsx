import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { HabitsManager } from "@/components/feature/HabitsManager";

export default async function HabitsSettingsPage() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const { data } = await sb
    .from("habits")
    .select("id, name, emoji, anti_fuga")
    .eq("user_id", user.id)
    .order("anti_fuga", { ascending: false })
    .order("created_at", { ascending: true });

  const habits = (data ?? []) as {
    id: string;
    name: string;
    emoji: string | null;
    anti_fuga: boolean;
  }[];

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 flex flex-col gap-3.5 max-w-2xl mx-auto md:max-w-none">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 2 }}>
        <Link href="/settings" style={{ fontSize: 13, color: "var(--color-fg-3)", textDecoration: "none" }}>
          ← Configuración
        </Link>
      </div>

      <h1 className="text-2xl font-semibold tracking-tight">Mis hábitos</h1>

      <Card>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".12em", color: "var(--color-fg-3)", marginBottom: 14 }}>
          GESTIONAR HÁBITOS
        </div>
        <HabitsManager initialHabits={habits} />
      </Card>

      <Card>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".12em", color: "var(--color-fg-3)", marginBottom: 8 }}>
          CÓMO FUNCIONA
        </div>
        <div style={{ fontSize: 12.5, color: "var(--color-fg-3)", lineHeight: 1.6 }}>
          • <strong>Anti-fuga</strong>: el hábito principal que mide la racha (ej. Sin domicilios).<br/>
          • Solo puede haber un anti-fuga activo — se usa para el streak en la pantalla de bloqueo.<br/>
          • Los hábitos se marcan diariamente desde la pantalla de Disciplina.
        </div>
      </Card>
    </div>
  );
}
