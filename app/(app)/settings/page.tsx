import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { Card } from "@/components/ui/Card";
import { SettingsForm } from "@/components/feature/SettingsForm";

export default async function SettingsPage() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const { data: profile } = await sb.from("profiles").select("*").maybeSingle();

  const fullName        = (profile?.full_name as string | null) ?? "";
  const dailyLimitCents = (profile?.daily_limit_cents as number | null) ?? 200_000_00;
  const metaTargetCents = (profile?.meta_target_cents as number | null) ?? 2_000_000_000_00;

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 flex flex-col gap-3.5 max-w-2xl mx-auto md:max-w-none">

      <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>

      {/* Account */}
      <Card>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".12em", color: "var(--color-fg-3)", marginBottom: 10 }}>
          CUENTA
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg, oklch(.72 .17 250), oklch(.85 .18 150))",
            display: "grid", placeItems: "center",
            fontSize: 16, fontWeight: 700, color: "var(--color-bg-0)",
          }}>
            {(user?.email?.[0] ?? "B").toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{user?.email}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--color-fg-4)", marginTop: 2 }}>
              {(profile?.timezone as string | null) ?? "America/Bogota"} · {(profile?.currency as string | null) ?? "COP"}
            </div>
          </div>
        </div>
      </Card>

      {/* Settings form */}
      <Card>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".12em", color: "var(--color-fg-3)", marginBottom: 14 }}>
          PREFERENCIAS
        </div>
        <SettingsForm
          fullName={fullName}
          dailyLimitCents={dailyLimitCents}
          metaTargetCents={metaTargetCents}
        />
      </Card>

      {/* Install */}
      <Card>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".12em", color: "var(--color-fg-3)", marginBottom: 8 }}>
          INSTALAR APP
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--color-fg-2)" }}>
          En Safari → compartir <span style={{ fontSize: 11 }}>⬆</span> → <em>Agregar a pantalla de inicio</em>.<br/>
          En Chrome/Edge → menú ⋮ → <em>Instalar aplicación</em>.
        </div>
      </Card>

      {/* Export */}
      <Card>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".12em", color: "var(--color-fg-3)", marginBottom: 10 }}>
          DATOS
        </div>
        <a
          href="/api/export"
          download
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "11px 0", borderRadius: 10, fontSize: 13.5, fontWeight: 600,
            background: "var(--color-bg-1)", border: "1px solid var(--color-hair)",
            color: "var(--color-fg)", textDecoration: "none",
          }}
        >
          Exportar datos JSON
        </a>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--color-fg-4)", marginTop: 6, textAlign: "center" }}>
          Descarga todos tus eventos, hábitos y proyectos
        </div>
      </Card>

      {/* About */}
      <Card>
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".12em", color: "var(--color-fg-3)", marginBottom: 6 }}>
          SISTEMA
        </div>
        <div style={{ fontSize: 13, color: "var(--color-fg-3)", lineHeight: 1.6 }}>
          BRAYAN OS · v0.1 ALPHA<br/>
          <span style={{ color: "var(--color-fg-4)" }}>Sistema operativo personal — disciplina, capital, claridad.</span>
        </div>
      </Card>

      {/* Sign out */}
      <form action={signOut}>
        <button
          type="submit"
          style={{
            width: "100%", padding: "13px 0", borderRadius: 12, fontSize: 14, fontWeight: 500,
            background: "oklch(0.6 0.18 25 / .1)", border: "1px solid oklch(0.6 0.18 25 / .3)",
            color: "oklch(0.7 0.15 25)", cursor: "pointer",
          }}
        >
          Cerrar sesión
        </button>
      </form>

    </div>
  );
}
