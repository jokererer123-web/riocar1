"use client";

import Header from "@/components/Header";
import { fallbackServices, isLocale, t, type Locale } from "@/lib/i18n";
import { supabaseBrowser } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function WorkerPage() {
  const params = useParams();
  const router = useRouter();
  const lang: Locale = isLocale(String(params.lang)) ? (params.lang as Locale) : "ky";
  const copy = t(lang);

  const [workerId, setWorkerId] = useState("");
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [mode, setMode] = useState<"home" | "scan" | "manual" | "pay">("home");
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [serviceId, setServiceId] = useState(fallbackServices[0].slug);
  const [pay, setPay] = useState("cash");
  const [msg, setMsg] = useState("");
  const scanRef = useRef<HTMLDivElement>(null);

  const login = async () => {
    const sb = supabaseBrowser();
    if (!sb) {
      setAuthed(true);
      return;
    }
    const email = `${workerId}@rio-workers.local`;
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
    else setAuthed(true);
  };

  useEffect(() => {
    if (mode !== "scan" || !scanRef.current) return;
    let scanner: any;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      scanner = new Html5Qrcode("qr-reader");
      await scanner.start(
        { facingMode: "environment" },
        { fps: 8, qrbox: 220 },
        (decoded: string) => {
          setCustomerId(decoded);
          setCustomerName("Customer");
          setMode("pay");
          scanner.stop();
        },
        () => {}
      );
    })();
    return () => {
      scanner?.stop?.().catch(() => {});
    };
  }, [mode]);

  const confirm = async () => {
    const sb = supabaseBrowser();
    const svc = fallbackServices.find((s) => s.slug === serviceId) || fallbackServices[0];
    const points = Math.round(Number(svc.price) / 100) || 10;
    if (sb) {
      const { data: sess } = await sb.auth.getUser();
      const { data: serviceRow } = await sb.from("services").select("id, points_reward, price").eq("slug", serviceId).single();
      await sb.from("transactions").insert({
        customer_id: customerId,
        worker_id: sess.user?.id,
        service_id: serviceRow?.id,
        amount: serviceRow?.price ?? svc.price,
        payment_method: pay,
        points_added: serviceRow?.points_reward ?? points,
      });
    }
    setMsg("OK");
    setTimeout(() => {
      setMode("home");
      setMsg("");
      router.refresh();
    }, 600);
  };

  return (
    <>
      <Header lang={lang} />
      <div className="container section ui">
        <h1>{copy.nav.worker}</h1>
        {!authed ? (
          <div className="card" style={{ maxWidth: 420, marginTop: 24 }}>
            <label>{copy.workerId}</label>
            <input value={workerId} onChange={(e) => setWorkerId(e.target.value)} />
            <label>{copy.password}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button className="btn" onClick={login}>
              {copy.login}
            </button>
            <p className="muted">{msg}</p>
          </div>
        ) : mode === "home" ? (
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 24, maxWidth: 640 }}>
            <button className="card btn" onClick={() => setMode("scan")}>
              {copy.scan}
            </button>
            <button className="card btn ghost" onClick={() => setMode("manual")}>
              {copy.manual}
            </button>
          </div>
        ) : mode === "scan" ? (
          <div className="card" style={{ marginTop: 24 }}>
            <div id="qr-reader" ref={scanRef} style={{ width: 320 }} />
            <button className="btn ghost" onClick={() => setMode("home")}>
              ←
            </button>
          </div>
        ) : mode === "manual" ? (
          <div className="card" style={{ maxWidth: 420, marginTop: 24 }}>
            <label>Customer UUID / phone</label>
            <input value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
            <button
              className="btn"
              onClick={() => {
                setCustomerName(customerId);
                setMode("pay");
              }}
            >
              {copy.confirm}
            </button>
          </div>
        ) : (
          <div className="card" style={{ maxWidth: 480, marginTop: 24 }}>
            <p>
              {customerName} <span className="muted">{customerId}</span>
            </p>
            <label>Service</label>
            <select value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              {fallbackServices.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {(s as any)[`title_${lang}`]} — {s.price} KGS
                </option>
              ))}
            </select>
            <label>{copy.payment}</label>
            <select value={pay} onChange={(e) => setPay(e.target.value)}>
              <option value="cash">{copy.cash}</option>
              <option value="card">{copy.card}</option>
              <option value="transfer">{copy.transfer}</option>
              <option value="points">{copy.points}</option>
            </select>
            <button className="btn" onClick={confirm}>
              {copy.confirm}
            </button>
            <p>{msg}</p>
          </div>
        )}
      </div>
    </>
  );
}
