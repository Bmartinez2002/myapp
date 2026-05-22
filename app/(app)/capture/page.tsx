import { supabaseServer } from "@/lib/supabase/server";
import { CaptureSheet } from "@/components/feature/CaptureSheet";

export const dynamic = "force-dynamic";

export default async function CapturePage() {
  const sb = await supabaseServer();
  const { data: cats = [] } = await sb.from("categories").select("id, slug, name, emoji, kind, risk_tier").order("name");
  return <CaptureSheet categories={cats ?? []}/>;
}
