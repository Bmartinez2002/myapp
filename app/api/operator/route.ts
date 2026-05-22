import { supabaseServer } from "@/lib/supabase/server";

export const runtime = "edge";

export async function POST(req: Request) {
  // Auth check
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { prompt } = await req.json() as { prompt: string };
  if (!prompt?.trim()) return Response.json({ error: "Empty prompt" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key":           apiKey,
      "anthropic-version":   "2023-06-01",
      "content-type":        "application/json",
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 512,
      stream:     true,
      system:     "Eres BRAYAN OS Operator. Responde en español de Colombia. Directo, sin emojis innecesarios, con números concretos cuando los tengas. Máximo 100 palabras salvo que te pidan más.",
      messages:   [{ role: "user", content: prompt }],
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.text();
    return Response.json({ error: err }, { status: upstream.status });
  }

  // Extract text deltas from Anthropic SSE and stream as plain text
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const reader  = upstream.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === "[DONE]") continue;
            try {
              const ev = JSON.parse(raw);
              if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") {
                controller.enqueue(encoder.encode(ev.delta.text));
              }
            } catch { /* ignore malformed SSE */ }
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type":           "text/plain; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
