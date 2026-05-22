import { supabaseServer } from "@/lib/supabase/server";
import { CaptureSheet } from "@/components/feature/CaptureSheet";

export const dynamic = "force-dynamic";

export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const sb = await supabaseServer();
  const params = await searchParams;
  const defaultKind = params.kind === "income" ? "income" : "expense";

  const { data: cats = [] } = await sb
    .from("categories")
    .select("id, slug, name, emoji, kind, risk_tier")
    .order("name");

  return <CaptureSheet categories={cats ?? []} defaultKind={defaultKind} />;
}
