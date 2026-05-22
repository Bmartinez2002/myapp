import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { CategoriesManager } from "@/components/feature/CategoriesManager";

export default async function CategoriesPage() {
  const sb = await supabaseServer();
  const { data: categories } = await sb
    .from("categories")
    .select("id, name, emoji, kind, risk_tier")
    .order("kind")
    .order("name");

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 flex flex-col gap-3.5 max-w-2xl mx-auto md:max-w-none">

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link href="/settings" style={{ color: "var(--color-fg-3)", textDecoration: "none", fontSize: 20 }}>←</Link>
        <h1 className="text-2xl font-semibold tracking-tight">Categorías</h1>
      </div>

      <Card>
        <CategoriesManager categories={categories ?? []} />
      </Card>

    </div>
  );
}
