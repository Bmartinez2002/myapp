"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "success">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const sb = supabaseBrowser();

    if (password.trim()) {
      const { error } = await sb.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      setStatus("success");
      location.reload();
      return;
    }

    const { error: otpError } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (otpError) {
      setError(otpError.message);
      setBusy(false);
      return;
    }
    setStatus("sent");
    setBusy(false);
  }

  return (
    <main className="min-h-dvh grid place-items-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-10">
          <div className="size-9 rounded-[10px] relative" style={{background:'conic-gradient(from 210deg at 50% 50%, var(--color-accent), var(--color-accent-2), var(--color-accent))', boxShadow:'0 0 24px oklch(0.85 0.18 150 / .35)'}}>
            <div className="absolute inset-[6px] rounded-[6px] bg-bg-0"/>
            <div className="absolute inset-[10px] rounded-[3px]" style={{background:'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))'}}/>
          </div>
          <div>
            <div className="text-lg font-semibold tracking-tight">BRAYAN OS</div>
            <div className="micro mt-0.5">v0.1 · ALPHA</div>
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Iniciar sesión</h1>
        <p className="text-fg-3 text-sm mt-1">Usa tu correo y contraseña, o deja la contraseña vacía para enlace mágico.</p>

        {status === "sent" ? (
          <div className="mt-8 p-4 rounded-card border" style={{borderColor:'var(--color-accent)', background:'var(--color-accent-soft)'}}>
            <div className="text-sm">Revisa tu correo. Toca el enlace desde tu celular para abrir la PWA.</div>
          </div>
        ) : status === "success" ? (
          <div className="mt-8 p-4 rounded-card border" style={{borderColor:'var(--color-accent)', background:'var(--color-accent-soft)'}}>
            <div className="text-sm">Inicio de sesión con contraseña exitoso. Redirigiendo...</div>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 flex flex-col gap-3">
            <input
              type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full px-4 py-3 rounded-card outline-none border bg-bg-1 text-fg placeholder:text-fg-4"
              style={{borderColor:'var(--color-hair)'}}
            />
            <input
              type="password" value={password} onChange={(e)=>setPassword(e.target.value)}
              placeholder="Contraseña (opcional para usar clave)"
              className="w-full px-4 py-3 rounded-card outline-none border bg-bg-1 text-fg placeholder:text-fg-4"
              style={{borderColor:'var(--color-hair)'}}
            />
            {error ? (
              <div className="text-sm text-red-500">{error}</div>
            ) : null}
            <button disabled={busy} className="px-4 py-3 rounded-card font-medium text-bg-0" style={{background:'linear-gradient(180deg, oklch(0.93 0.14 150), oklch(0.78 0.18 150))'}}>
              {busy ? "Procesando…" : "Iniciar sesión"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
