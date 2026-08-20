"use client";

import Header from "@/components/Header";
import { isLocale, t, type Locale } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Tx = {
  id: string;
  amount: number;
  payment_method: string;
  points_added: number;
  created_at: string;
  worker_id: string;
};

export default function AdminPage() {
  const params = useParams();
  const lang: Locale = isLocale(String(params.lang)) ? (params.lang as Locale) : "ky";
  const copy = t(lang);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [threshold, setThreshold] = useState(100);
  const [promo, setPromo] = useState({ title_ky: "", title_ru: "", title_en: "", description_ky: "", description_ru: "", description_en: "" });
  const [msg, setMsg] = useState("");

  const today = txs.filter((x) => x.created_at.slice(0, 10) === new Date().toISOString().slice(0, 10));
  const revenue = today.reduce((s, x) => s + Number(x.amount), 0);

  useEffect(() => {
    const sb = supabaseBrowser();
    if (!sb) return;
    sb.auth.getSession().then(({ data }) => setAuthed(Boolean(data.session)));
  }, []);

  const login = async () => {
    const sb = supabaseBrowser();
    if (!sb) {
      setAuthed(true);
      setMsg("Demo mode (no Supabase env) — UI unlocked.");
      return;
    }
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
    else {
      setAuthed(true);
      load();
    }
  };

  const load = async () => {
    const sb = supabaseBrowser();
    if (!sb) return;
    const { data } = await sb.from("transactions").select("*").order("created_at", { ascending: false }).limit(200);
    setTxs((data as Tx[]) || []);
    const { data: ls } = await sb.from("loyalty_settings").select("*").eq("id", 1).single();
    if (ls) setThreshold(ls.reward_threshold);
  };

  useEffect(() => {
    if (authed) load();
  }, [authed]);

  const publish = async () => {
    const sb = supabaseBrowser();
    if (!sb) {
      setMsg("Demo: broadcast queued locally.");
      return;
    }
    await sb.from("promotions").update({ is_active: false }).eq("is_active", true);
    const { error } = await sb.from("promotions").insert({ ...promo, is_active: true });
    setMsg(error ? error.message : "Live on web + mobile.");
  };

  const saveLoyalty = async () => {
    const sb = supabaseBrowser();
    if (!sb) return;
    await sb.from("loyalty_settings").upsert({ id: 1, reward_threshold: threshold, updated_at: new Date().toISOString() });
    setMsg("Loyalty saved.");
  };

  return (
    <>
      <Header lang={lang} />
      <div className="container section ui">
        <h1>{copy.dashboard} · Admin</h1>
        {!authed ? (
          <div className="card" style={{ maxWidth: 420, marginTop: 24 }}>
            <label>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} />
            <label>{copy.password}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="btn" onClick={login}>
              {copy.login}
            </button>
            <p className="muted" style={{ marginTop: 12 }}>{msg}</p>
          </div>
        ) : (
          <div className="grid" style={{ marginTop: 24, gridTemplateColumns: "1fr 1fr" }}>
            <div className="card">
              <h3>{copy.reports}</h3>
              <p style={{ fontSize: 28, margin: "12px 0" }} className="gold">
                {today.length} {copy.scansToday}
              </p>
              <p>
                {copy.revenue}: <strong>{revenue} KGS</strong>
              </p>
              <table style={{ marginTop: 16 }}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Pay</th>
                    <th>KGS</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {today.map((x) => (
                    <tr key={x.id}>
                      <td>{x.created_at.slice(11, 16)}</td>
                      <td>{x.payment_method}</td>
                      <td>{x.amount}</td>
                      <td>{x.points_added}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card">
              <h3>{copy.broadcast}</h3>
              {(["ky", "ru", "en"] as const).map((l) => (
                <div key={l}>
                  <label>Title {l}</label>
                  <input value={(promo as any)[`title_${l}`]} onChange={(e) => setPromo({ ...promo, [`title_${l}`]: e.target.value })} />
                  <label>Text {l}</label>
                  <input value={(promo as any)[`description_${l}`]} onChange={(e) => setPromo({ ...promo, [`description_${l}`]: e.target.value })} />
                </div>
              ))}
              <button className="btn" onClick={publish}>
                {copy.publish}
              </button>
              <hr style={{ margin: "24px 0", borderColor: "var(--line)" }} />
              <h3>{copy.loyalty}</h3>
              <label>{copy.rewardAt}</label>
              <input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} />
              <button className="btn ghost" onClick={saveLoyalty}>
                Save
              </button>
              <p className="muted" style={{ marginTop: 12 }}>{msg}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
