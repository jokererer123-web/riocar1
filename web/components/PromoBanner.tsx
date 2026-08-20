"use client";

import { useEffect, useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase";

export default function PromoBanner({ lang }: { lang: Locale }) {
  const copy = t(lang);
  const [promo, setPromo] = useState<{ title: string; description: string } | null>(null);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) return;
    const keyT = `title_${lang}`;
    const keyD = `description_${lang}`;
    const load = async () => {
      const { data } = await sb.from("promotions").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(1);
      const row = data?.[0];
      if (row) setPromo({ title: row[keyT] || row.title_en, description: row[keyD] || "" });
    };
    load();
    const ch = sb
      .channel("promos")
      .on("postgres_changes", { event: "*", schema: "public", table: "promotions" }, load)
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [lang]);

  if (!promo) return null;
  return (
    <div className="banner ui">
      <strong className="gold">{copy.promoBanner}:</strong> {promo.title} — {promo.description}
    </div>
  );
}
