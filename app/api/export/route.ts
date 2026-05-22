import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [events, habits, debts, projects, reviews] = await Promise.all([
    sb.from("money_events").select("*").order("occurred_at", { ascending: false }),
    sb.from("habits").select("*"),
    sb.from("debts").select("*"),
    sb.from("projects").select("*"),
    sb.from("weekly_reviews").select("*").order("week_start", { ascending: false }),
  ]);

  const payload = {
    exported_at:   new Date().toISOString(),
    schema:        "brayan-os-v1",
    money_events:  events.data  ?? [],
    habits:        habits.data  ?? [],
    debts:         debts.data   ?? [],
    projects:      projects.data ?? [],
    weekly_reviews: reviews.data ?? [],
  };

  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type":        "application/json",
      "content-disposition": `attachment; filename="brayan-os-${date}.json"`,
    },
  });
}
