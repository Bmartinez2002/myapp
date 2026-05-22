import { NextResponse } from "next/server";
import { openai, MODELS } from "@/lib/openai";
import { SimulateRequest } from "@/lib/schemas";

export async function POST(req: Request) {
  const body = SimulateRequest.parse(await req.json());
  const completion = await openai.chat.completions.create({
    model: MODELS.smart,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Simula un escenario financiero. Devuelve JSON: {summary_md, impact_cents, stability_delta, days_to_meta_delta}." },
      { role: "user", content: JSON.stringify(body) },
    ],
  });
  return NextResponse.json(JSON.parse(completion.choices[0].message.content ?? "{}"));
}
