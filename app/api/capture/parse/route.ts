import { NextResponse } from "next/server";
import { openai, MODELS } from "@/lib/openai";
import { supabaseServer } from "@/lib/supabase/server";
import { ParseRequest } from "@/lib/schemas";

export async function POST(req: Request) {
  const json = await req.json();
  const body = ParseRequest.parse(json);
  const sb = await supabaseServer();
  const { data: cats } = await sb.from("categories").select("slug, name, emoji, kind");

  const completion = await openai.chat.completions.create({
    model: MODELS.fast,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `Eres un parser de gastos en es-CO. Devuelves JSON con:
amount_cents (entero, COP*100), merchant (texto opcional), category_slug (uno de la lista), confidence (0..1), needs_confirmation (bool).
Categorías disponibles: ${JSON.stringify(cats)}.`,
      },
      { role: "user", content: body.text },
    ],
  });

  const parsed = JSON.parse(completion.choices[0].message.content ?? "{}");
  return NextResponse.json(parsed);
}
