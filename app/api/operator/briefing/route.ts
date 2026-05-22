import { NextResponse } from "next/server";
import { openai, MODELS } from "@/lib/openai";
import { supabaseServer } from "@/lib/supabase/server";

const SYSTEM = `Eres el BRAYAN OS Operator. Tu trabajo es producir un briefing matutino de 60 segundos en es-CO.
Tono: directo, cálido, sin corporativismo. Nada motivacional vacío. Siempre específico.
Restricciones:
- ≤ 120 palabras.
- 1 frase de estado, 1-2 acciones concretas con $ o %, 1 riesgo si aplica.
- Usa los números reales que te paso. No inventes.
- No uses: "¡bien hecho!", "sigue así", emojis, exclamaciones.`;

export async function POST(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}` && !req.headers.get("x-user")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "no user" }, { status: 401 });

  const today = new Date().toISOString().slice(0,10);
  const { data: snap } = await sb.from("daily_snapshots").select("*").eq("user_id", user.id).eq("on_date", today).maybeSingle();
  const { data: debts } = await sb.from("debts").select("name, total_cents, due_at, rate_annual").is("closed_at", null);

  const userMsg = {
    state: { stability: snap?.stability, streak: snap?.streak_clean_days, meta_progress_pct: snap ? (Number(snap.meta_progress_cents)/2000000000)*100 : null },
    today_due: debts ?? [],
  };

  const completion = await openai.chat.completions.create({
    model: MODELS.fast,
    messages: [{ role: "system", content: SYSTEM }, { role: "user", content: JSON.stringify(userMsg) }],
  });
  const content = completion.choices[0].message.content ?? "";

  await sb.from("ai_briefings").insert({ user_id: user.id, kind: "daily", content_md: content, meta: userMsg });
  return NextResponse.json({ ok: true, content });
}
