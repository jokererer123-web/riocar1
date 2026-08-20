import { useEffect, useMemo, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { Link } from "expo-router";
import { dict, type Locale } from "../lib/i18n";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [lang, setLang] = useState<Locale>("ky");
  const copy = dict[lang];
  const [uid, setUid] = useState("demo-customer");
  const [name, setName] = useState("Rio Guest");
  const [points, setPoints] = useState(35);
  const [threshold, setThreshold] = useState(100);
  const [promo, setPromo] = useState<string | null>(null);
  const progress = Math.min(1, points / threshold);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUid(data.user.id);
      const { data: p } = await supabase.from("profiles").select("*").eq("id", data.user.id).single();
      if (p) {
        setName(p.full_name);
        setPoints(p.points_balance);
      }
    });
    supabase.from("loyalty_settings").select("reward_threshold").eq("id", 1).single().then(({ data }) => {
      if (data) setThreshold(data.reward_threshold);
    });
    const loadPromo = async () => {
      const { data } = await supabase.from("promotions").select("*").eq("is_active", true).limit(1);
      const row = data?.[0];
      if (row) setPromo(row[`title_${lang}`] || row.title_en);
    };
    loadPromo();
    const ch = supabase
      .channel("p")
      .on("postgres_changes", { event: "*", schema: "public", table: "promotions" }, loadPromo)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, async () => {
        const { data } = await supabase.auth.getUser();
        if (!data.user) return;
        const { data: p } = await supabase.from("profiles").select("points_balance").eq("id", data.user.id).single();
        if (p) setPoints(p.points_balance);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [lang]);

  const langs = useMemo(() => ["ky", "ru", "en"] as Locale[], []);

  return (
    <SafeAreaView style={s.wrap}>
      <View style={s.row}>
        {langs.map((l) => (
          <Pressable key={l} onPress={() => setLang(l)}>
            <Text style={[s.lang, lang === l && s.langOn]}>{l.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.brand}>{copy.brand}</Text>
      <Text style={s.muted}>{name}</Text>
      <View style={s.qr}>
        <QRCode value={uid} size={200} backgroundColor="#0c0e14" color="#c9a227" />
      </View>
      <Text style={s.pts}>
        {copy.pointsBalance}: {points} / {threshold}
      </Text>
      <View style={s.bar}>
        <View style={[s.fill, { width: `${progress * 100}%` }]} />
      </View>
      {promo ? (
        <View style={s.promo}>
          <Text style={s.gold}>{copy.promoBanner}</Text>
          <Text style={s.muted}>{promo}</Text>
        </View>
      ) : null}
      <Link href="/auth" style={s.link}>
        {copy.login} / {copy.register}
      </Link>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: "#07080c", padding: 24, alignItems: "center" },
  brand: { color: "#e8d48b", fontSize: 32, marginTop: 8 },
  muted: { color: "#9aa3b2", marginTop: 4 },
  gold: { color: "#c9a227" },
  qr: { marginVertical: 28, padding: 16, backgroundColor: "#0c0e14", borderRadius: 16, borderWidth: 1, borderColor: "rgba(201,162,39,0.3)" },
  pts: { color: "#f4f1ea", fontSize: 18 },
  bar: { height: 8, width: "100%", backgroundColor: "#1c2230", borderRadius: 8, marginTop: 12, overflow: "hidden" },
  fill: { height: 8, backgroundColor: "#c9a227" },
  promo: { marginTop: 24, padding: 16, borderWidth: 1, borderColor: "rgba(201,162,39,0.3)", borderRadius: 12, width: "100%" },
  row: { flexDirection: "row", gap: 12, alignSelf: "flex-end" },
  lang: { color: "#9aa3b2", padding: 6 },
  langOn: { color: "#c9a227" },
  link: { color: "#c9a227", marginTop: 28 },
});
